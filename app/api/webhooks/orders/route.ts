/**
 * POST /api/webhooks/orders
 *
 * Multi-tenant Shopify orders/create webhook.
 * Each brand's store is identified by the x-shopify-shop-domain header.
 * HMAC is verified using the per-store secret stored in DB (fallback: env SHOPIFY_WEBHOOK_SECRET).
 *
 * Attribution window + eligible product filtering enforced per-program.
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/shopify";

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

interface ShopifyLineItem { handle: string; price: string; quantity: number; }
interface ShopifyOrderPayload {
  id: number;
  total_price: string;
  currency: string;
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

  const shopifyOrderId = String(payload.id);
  const currency       = payload.currency ?? "USD";

  // ── Extract referral code ──────────────────────────────────────────────────
  // Check note_attributes first (set by Shopify checkout snippet / Checkout UI Extension)
  let referralCode: string | null =
    payload.note_attributes?.find(a => a.name.toLowerCase() === "ref")?.value?.trim() ?? null;

  // Fallback: parse ?ref= from the landing_site URL
  if (!referralCode && payload.landing_site) {
    try {
      const landingUrl = payload.landing_site.startsWith("http")
        ? payload.landing_site
        : `https://${shopDomain}${payload.landing_site}`;
      referralCode = new URL(landingUrl).searchParams.get("ref");
    } catch { /* ignore malformed URLs */ }
  }

  const affiliate = referralCode ? await db.findAffiliateByCode(referralCode) : null;
  const program   = affiliate    ? await db.findProgramById(affiliate.programId) : null;

  // ── Attribution window check ───────────────────────────────────────────────
  let withinWindow = false;
  if (affiliate && program) {
    const lastClick = await db.findLatestClickByCode(referralCode!);
    if (lastClick) {
      const windowMs = program.attributionWindowDays * 24 * 60 * 60 * 1000;
      withinWindow   = Date.now() - new Date(lastClick.createdAt).getTime() <= windowMs;
    } else {
      // No click record — still credit (direct link paste with valid code)
      withinWindow = true;
    }
  }

  // ── Eligible product + amount calculation ─────────────────────────────────
  let amount = parseFloat(payload.total_price);

  if (affiliate && program && !program.allProducts && payload.line_items?.length) {
    const eligibleProductIds = await db.findProgramProductIds(program.id);
    const storeProducts      = await db.findProductsByStoreId(store.id);
    const eligibleHandles    = new Set(
      storeProducts
        .filter(p => eligibleProductIds.includes(p.id))
        .map(p => p.handle)
    );
    const eligibleItems = payload.line_items.filter(item => eligibleHandles.has(item.handle));
    amount = eligibleItems.length === 0
      ? 0
      : eligibleItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  }

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
  if (affiliate && program && withinWindow && amount > 0) {
    const commissionAmount =
      Math.round(amount * (program.commissionRate / 100) * 100) / 100;
    commission = await db.createCommission({
      id:          nanoid(),
      orderId:     order.id,
      affiliateId: affiliate.id,
      programId:   program.id,
      amount:      commissionAmount,
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
