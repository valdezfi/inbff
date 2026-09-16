/**
 * POST /api/webhooks/orders
 *
 * Multi-tenant Shopify orders/paid webhook.
 * Each brand's store is identified by the x-shopify-shop-domain header.
 * HMAC is verified using the Shopify app client secret.
 *
 * Attribution window + eligible product filtering enforced per-program.
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/shopify";
import { isAttributionEligible, normalizeReferralCode } from "@/lib/referrals";

async function readRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

interface ShopifyLineItem { product_id: number | string | null; price: string; quantity: number; discount_allocations?: { amount: string }[]; }
interface ShopifyOrderPayload {
  id: number;
  total_price: string;
  currency: string;
  financial_status?: string;
  discount_codes?: { code: string; type?: string; amount?: string }[];
  note_attributes?: { name: string; value: string }[];
  landing_site?: string;
  line_items?: ShopifyLineItem[];
}

export async function POST(req: NextRequest) {
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";

  // Read raw body first (needed for HMAC verification)
  const rawBody = await readRawBody(req);

  // Look up the store — needed to get the per-store webhook secret
  const store = await db.findStoreByDomain(shopDomain);
  if (!store) {
    // Unknown store — ack silently so Shopify doesn't retry
    console.warn(`[webhook] unknown shop domain: ${shopDomain}`);
    return NextResponse.json({ ok: true });
  }

  // Verify HMAC using per-store secret
  if (!verifyWebhookHmac(rawBody, hmacHeader, store)) {
    console.error(`[webhook] HMAC mismatch for ${shopDomain}`);
    return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });
  }

  // Parse payload
  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as ShopifyOrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!payload || !payload.id || !Number.isFinite(Number(payload.total_price)) || Number(payload.total_price) < 0) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  }
  if (req.headers.get("x-shopify-topic") !== "orders/paid" || payload.financial_status !== "paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (Number(payload.total_price) === 0) return NextResponse.json({ ok: true });
  const shopifyOrderId = String(payload.id);
  const currency       = payload.currency ?? "USD";

  // ── Extract affiliate ──────────────────────────────────────────────────────
  let affiliate = null;
  let referralCode: string | null = null;

  // 1. Check if a known discount code was used (Primary attribution method)
  if (payload.discount_codes) {
    for (const dc of payload.discount_codes) {
      const found = await db.findAffiliateByDiscountCode(dc.code);
      if (found) {
        affiliate = found;
        referralCode = found.referralCode;
        break;
      }
    }
  }

  // 2. Check note_attributes and landing site (Fallback cookie attribution)
  if (!affiliate) {
    let rawCode: string | null =
      payload.note_attributes?.find(a => ["referly_ref", "ref"].includes(a.name.toLowerCase()))?.value?.trim() ?? null;

    if (!rawCode && payload.landing_site) {
      try {
        const landingUrl = payload.landing_site.startsWith("http")
          ? payload.landing_site
          : `https://${shopDomain}${payload.landing_site}`;
        rawCode = new URL(landingUrl).searchParams.get("ref");
      } catch { /* ignore malformed URLs */ }
    }

    if (rawCode) {
      referralCode = normalizeReferralCode(rawCode);
      if (referralCode) {
        affiliate = await db.findAffiliateByCode(referralCode);
      }
    }
  }

  const program = affiliate ? await db.findProgramById(affiliate.programId) : null;

  // ── Attribution window check ───────────────────────────────────────────────
  const lastClick = referralCode ? await db.findLatestClickByCode(referralCode) : null;
  const withinWindow = !!affiliate && !!program && program.currency === currency && isAttributionEligible({
    affiliateActive: affiliate.status === "active",
    programActive: program.status === "active",
    programStoreId: program.storeId,
    webhookStoreId: store.id,
    latestClickAt: lastClick?.createdAt ?? null,
    attributionWindowDays: program.attributionWindowDays,
    now: Date.now(),
  });

  // ── Eligible product + amount calculation ─────────────────────────────────
  let amount = 0;
  let eligibleShopifyIds: Set<string> | null = null;

  if (affiliate && program && !program.allProducts) {
    const eligibleProductIds = await db.findProgramProductIds(program.id);
    const storeProducts      = await db.findProductsByStoreId(store.id);
    eligibleShopifyIds = new Set(
      storeProducts
        .filter(p => eligibleProductIds.includes(p.id))
        .map(p => p.shopifyProductId.split('/').pop()!)
    );
  }
  for (const item of payload.line_items ?? []) {
    if (eligibleShopifyIds && !eligibleShopifyIds.has(String(item.product_id))) continue;
    const price = Number(item.price);
    const discount = (item.discount_allocations ?? []).reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(item.quantity) || item.quantity < 0 || !Number.isFinite(discount) || discount < 0) {
      return NextResponse.json({ error: "Invalid line item." }, { status: 400 });
    }
    amount += Math.max(0, Math.round(price * 100) * item.quantity - Math.round(discount * 100));
  }
  amount = Math.min(amount / 100, Number(payload.total_price));

  // ── Record order (idempotent) ──────────────────────────────────────────────
  const order = await db.createOrder({
    id:           nanoid(),
    programId:    (affiliate && withinWindow && program) ? program.id : null,
    storeId:      store.id,
    shopifyOrderId,
    referralCode: (affiliate && withinWindow && amount > 0) ? referralCode : null,
    affiliateId:  (affiliate && withinWindow && amount > 0) ? affiliate.id : null,
    amount:       parseFloat(payload.total_price), // always record full order amount
    currency,
  });

  if (!order) return NextResponse.json({ ok: true }); // duplicate

  // ── Create commission ──────────────────────────────────────────────────────
  let commission = null;
  if (affiliate && program && withinWindow && amount > 0 && !await db.findCommissionByOrderId(order.id)) {
    const commissionAmount =
      Math.round(amount * (program.commissionRate / 100) * 100) / 100;
    if (!Number.isFinite(commissionAmount) || commissionAmount <= 0) {
      return NextResponse.json({ ok: true, order: { id: order.id }, commission: null });
    }
    const platformFee = Math.round(amount * 0.02 * 100) / 100; // 2% platform cut
    commission = await db.createCommission({
      id:          nanoid(),
      orderId:     order.id,
      affiliateId: affiliate.id,
      programId:   program.id,
      amount:      commissionAmount,
      platformFee,
      rate:        program.commissionRate,
      status:      "pending",
    });
    console.log(
      `[webhook] commission $${commissionAmount} for affiliate ${affiliate.id} ` +
      `on order ${shopifyOrderId} (${shopDomain})`
    );
  }

  return NextResponse.json({ ok: true, order: { id: order.id }, commission: commission ? { id: commission.id } : null });
}
