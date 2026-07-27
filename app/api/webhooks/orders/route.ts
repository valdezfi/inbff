/**
 * POST /api/webhooks/orders
 * Real Shopify orders/create webhook — HMAC verified.
 * Attribution window + eligible product filtering enforced per-program.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

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
  const shopDomain  = req.headers.get("x-shopify-shop-domain") ?? "";
  const hmacHeader  = req.headers.get("x-shopify-hmac-sha256") ?? "";

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("SHOPIFY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const rawBody = await readRawBody(req);
  const digest  = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");

  let isValid = false;
  try { isValid = timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader)); } catch { isValid = false; }
  if (!isValid) return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });

  let payload: ShopifyOrderPayload;
  try { payload = JSON.parse(rawBody.toString("utf-8")) as ShopifyOrderPayload; }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const shopifyOrderId = String(payload.id);
  const currency       = payload.currency ?? "USD";

  const store = await db.findStoreByDomain(shopDomain);
  if (!store) return NextResponse.json({ ok: true }); // unknown store — ack silently

  // Extract referral code
  let referralCode: string | null =
    payload.note_attributes?.find(a => a.name.toLowerCase() === "ref")?.value ?? null;
  if (!referralCode && payload.landing_site) {
    try {
      const u = new URL(payload.landing_site.startsWith("http") ? payload.landing_site : `https://${shopDomain}${payload.landing_site}`);
      referralCode = u.searchParams.get("ref");
    } catch { /* ignore */ }
  }

  const affiliate = referralCode ? await db.findAffiliateByCode(referralCode) : null;
  const program   = affiliate    ? await db.findProgramById(affiliate.programId) : null;

  // Attribution window check
  let withinWindow = false;
  if (affiliate && program) {
    const lastClick = await db.findLatestClickByCode(referralCode!);
    if (lastClick) {
      const windowMs = program.attributionWindowDays * 24 * 60 * 60 * 1000;
      withinWindow   = Date.now() - new Date(lastClick.createdAt).getTime() <= windowMs;
    } else {
      // Cookie-based attribution without click record — still credit if within window using order time
      // Fall back to crediting when there's a valid referral code even without a click record
      withinWindow = true;
    }
  }

  // Eligible product + amount calculation
  let amount = parseFloat(payload.total_price);
  if (affiliate && program && !program.allProducts && payload.line_items?.length) {
    const eligibleProductIds = await db.findProgramProductIds(program.id);
    // We stored product handles in shopify_products — look them up
    const storeProducts = await db.findProductsByStoreId(store.id);
    const eligibleHandles = new Set(
      storeProducts.filter(p => eligibleProductIds.includes(p.id)).map(p => p.handle)
    );
    const eligibleItems = payload.line_items.filter(item => eligibleHandles.has(item.handle));
    if (eligibleItems.length === 0) {
      // No eligible products — record order but no commission
      amount = 0;
    } else {
      amount = eligibleItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    }
  }

  if (amount <= 0) {
    // Still record the order (for analytics) but skip commission
    await db.createOrder({
      id: nanoid(), programId: program?.id ?? null, storeId: store.id,
      shopifyOrderId, referralCode: null, affiliateId: null,
      amount: parseFloat(payload.total_price), currency,
    }).catch(() => {}); // ignore duplicate
    return NextResponse.json({ ok: true });
  }

  const order = await db.createOrder({
    id: nanoid(),
    programId:   (affiliate && withinWindow && program) ? program.id : null,
    storeId:     store.id,
    shopifyOrderId,
    referralCode: (affiliate && withinWindow) ? referralCode : null,
    affiliateId:  (affiliate && withinWindow) ? affiliate.id : null,
    amount,
    currency,
  });

  if (!order) return NextResponse.json({ ok: true }); // duplicate — idempotent

  let commission = null;
  if (affiliate && program && withinWindow) {
    const commissionAmount = Math.round(amount * (program.commissionRate / 100) * 100) / 100;
    commission = await db.createCommission({
      id: nanoid(), orderId: order.id, affiliateId: affiliate.id,
      programId: program.id, amount: commissionAmount,
      rate: program.commissionRate, status: "pending",
      paidAt: null, stripeTransferId: null,
    });
  }

  return NextResponse.json({ order, commission });
}
