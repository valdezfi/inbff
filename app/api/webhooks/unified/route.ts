import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
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

interface ShopifyLineItem { handle: string; price: string; quantity: number; }
interface ShopifyOrderPayload {
  id: number;
  total_price: string;
  currency: string;
  note_attributes?: { name: string; value: string }[];
  landing_site?: string;
  line_items?: ShopifyLineItem[];
}

interface UnifiedWebhookPayload {
  event: string;
  type: string;
  workspace_id: string;
  connection_id: string;
  data: {
    raw?: ShopifyOrderPayload;
  };
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-unified-signature") ?? "";
  const rawBody = await readRawBody(req);
  const secret = process.env.UNIFIED_WEBHOOK_SECRET;

  if (secret) {
    try {
      const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
      if (!timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
        console.error(`[unified-webhook] HMAC mismatch`);
        return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });
    }
  } else {
    console.warn(`[unified-webhook] UNIFIED_WEBHOOK_SECRET not set, skipping verification.`);
  }

  let payload: UnifiedWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as UnifiedWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (payload.type !== "commerce_order") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const shopifyPayload = payload.data.raw;
  if (!shopifyPayload) {
    return NextResponse.json({ error: "Missing raw Shopify data." }, { status: 400 });
  }

  // Find store by connection ID
  const store = await db.findStoreByAccessToken(`unified:${payload.connection_id}`);
  if (!store) {
    console.warn(`[unified-webhook] unknown connection id: ${payload.connection_id}`);
    return NextResponse.json({ ok: true });
  }

  const shopDomain = store.shopDomain;
  const shopifyOrderId = String(shopifyPayload.id);
  const currency       = shopifyPayload.currency ?? "USD";

  // ── Extract referral code ──────────────────────────────────────────────────
  let referralCode: string | null =
    shopifyPayload.note_attributes?.find(a => ["referly_ref", "ref"].includes(a.name.toLowerCase()))?.value?.trim() ?? null;

  if (!referralCode && shopifyPayload.landing_site) {
    try {
      const landingUrl = shopifyPayload.landing_site.startsWith("http")
        ? shopifyPayload.landing_site
        : `https://${shopDomain}${shopifyPayload.landing_site}`;
      referralCode = new URL(landingUrl).searchParams.get("ref");
    } catch { /* ignore malformed URLs */ }
  }

  referralCode = referralCode ? normalizeReferralCode(referralCode) : null;
  const affiliate = referralCode ? await db.findAffiliateByCode(referralCode) : null;
  const program   = affiliate    ? await db.findProgramById(affiliate.programId) : null;

  // ── Attribution window check ───────────────────────────────────────────────
  const lastClick = referralCode ? await db.findLatestClickByCode(referralCode) : null;
  const withinWindow = !!affiliate && !!program && isAttributionEligible({
    affiliateActive: affiliate.status === "active",
    programActive: program.status === "active",
    programStoreId: program.storeId,
    webhookStoreId: store.id,
    latestClickAt: lastClick?.createdAt ?? null,
    attributionWindowDays: program.attributionWindowDays,
    now: Date.now(),
  });

  // ── Eligible product + amount calculation ─────────────────────────────────
  let amount = parseFloat(shopifyPayload.total_price);

  if (affiliate && program && !program.allProducts && shopifyPayload.line_items?.length) {
    const eligibleProductIds = await db.findProgramProductIds(program.id);
    const storeProducts      = await db.findProductsByStoreId(store.id);
    const eligibleHandles    = new Set(
      storeProducts
        .filter(p => eligibleProductIds.includes(p.id))
        .map(p => p.handle)
    );
    const eligibleItems = shopifyPayload.line_items.filter(item => eligibleHandles.has(item.handle));
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
    amount:       parseFloat(shopifyPayload.total_price),
    currency,
  });

  if (!order) return NextResponse.json({ ok: true }); // duplicate

  // ── Create commission ──────────────────────────────────────────────────────
  let commission = null;
  if (affiliate && program && withinWindow && amount > 0 && !await db.findCommissionByOrderId(order.id)) {
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
      `[unified-webhook] commission $${commissionAmount} for affiliate ${affiliate.id} ` +
      `on order ${shopifyOrderId} (${shopDomain})`
    );
  }

  return NextResponse.json({ ok: true, order: { id: order.id }, commission: commission ? { id: commission.id } : null });
}
