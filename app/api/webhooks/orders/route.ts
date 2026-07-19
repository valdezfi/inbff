/**
 * Shopify orders/create webhook.
 *
 * Shopify calls this endpoint (POST) whenever a new order is placed in a
 * connected store.  We:
 *   1. Verify the X-Shopify-Hmac-Sha256 header so only genuine Shopify
 *      payloads are processed.
 *   2. Look up the referral code from the order's note_attributes (where our
 *      storefront tracking script deposits it at checkout).
 *   3. Create the order record and — if there's a referral — the commission.
 *
 * Required env var:
 *   SHOPIFY_WEBHOOK_SECRET  — the signing secret shown in Shopify Partners →
 *                             App setup → Webhooks
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

// ── Helper: read the raw body as a Buffer ─────────────────────────────────────
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

// ── Webhook shape (simplified — only the fields we use) ───────────────────────
interface ShopifyOrderPayload {
  id: number;
  total_price: string;
  currency: string;
  note_attributes?: Array<{ name: string; value: string }>;
  landing_site?: string;
}

export async function POST(req: NextRequest) {
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";

  // ── 1. HMAC verification ─────────────────────────────────────────────────
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const rawBody = await readRawBody(req);
  const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");

  let isValid = false;
  try {
    isValid = timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid HMAC signature." }, { status: 401 });
  }

  // ── 2. Parse payload ─────────────────────────────────────────────────────
  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as ShopifyOrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const shopifyOrderId = String(payload.id);
  const amount = parseFloat(payload.total_price);
  const currency = payload.currency ?? "USD";

  if (!shopDomain || !shopifyOrderId || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Malformed order payload." }, { status: 400 });
  }

  // ── 3. Resolve referral code ──────────────────────────────────────────────
  // Our storefront tracking script writes the ref code into note_attributes
  // under the key "ref". We also check landing_site as a fallback (the
  // script can alternatively append ?ref=CODE to the landing URL).
  let referralCode: string | null = null;

  const noteRef = payload.note_attributes?.find(
    (a) => a.name.toLowerCase() === "ref"
  )?.value;

  if (noteRef) {
    referralCode = noteRef;
  } else if (payload.landing_site) {
    try {
      const url = new URL(
        payload.landing_site.startsWith("http")
          ? payload.landing_site
          : `https://${shopDomain}${payload.landing_site}`
      );
      referralCode = url.searchParams.get("ref");
    } catch {
      // landing_site wasn't a valid URL — ignore
    }
  }

  // ── 4. Persist order + commission ────────────────────────────────────────
  const store = await db.findStoreByDomain(shopDomain);
  if (!store) {
    // This store isn't registered with us — ignore the webhook silently
    // (returning 200 so Shopify doesn't retry)
    return NextResponse.json({ ok: true });
  }

  const affiliate = referralCode ? await db.findAffiliateByCode(referralCode) : null;
  const program = affiliate ? await db.findProgramById(affiliate.programId) : null;

  const order = await db.createOrder({
    id: nanoid(),
    programId: program?.id ?? null,
    storeId: store.id,
    shopifyOrderId,
    referralCode: affiliate ? referralCode : null,
    affiliateId: affiliate?.id ?? null,
    amount,
    currency,
  });

  // order can be null if the (store_id, shopify_order_id) pair already exists
  // (Shopify occasionally delivers webhooks more than once — idempotent)
  if (!order) {
    return NextResponse.json({ ok: true });
  }

  let commission = null;
  if (affiliate && program) {
    const commissionAmount =
      Math.round(amount * (program.commissionRate / 100) * 100) / 100;
    commission = await db.createCommission({
      id: nanoid(),
      orderId: order.id,
      affiliateId: affiliate.id,
      programId: program.id,
      amount: commissionAmount,
      rate: program.commissionRate,
      status: "pending",
      paidAt: null,
      stripeTransferId: null,
    });
  }

  return NextResponse.json({ order, commission });
}
