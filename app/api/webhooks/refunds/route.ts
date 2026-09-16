/**
 * POST /api/webhooks/refunds
 *
 * Handles orders/cancelled and refunds/create webhooks from Shopify.
 * Reverses or marks pending commissions as cancelled/refunded.
 */
import { NextRequest, NextResponse } from "next/server";
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

interface ShopifyCancelPayload {
  id: number;
  order_id?: number; // for refunds
  cancelled_at?: string;
  cancel_reason?: string;
}

export async function POST(req: NextRequest) {
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";

  const rawBody = await readRawBody(req);
  const store = await db.findStoreByDomain(shopDomain);
  if (!store) {
    console.warn(`[webhook/refunds] unknown shop domain: ${shopDomain}`);
    return NextResponse.json({ ok: true });
  }

  if (!verifyWebhookHmac(rawBody, hmacHeader, store)) {
    console.error(`[webhook/refunds] HMAC mismatch for ${shopDomain}`);
    return NextResponse.json({ error: "Invalid HMAC." }, { status: 401 });
  }

  let payload: ShopifyCancelPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as ShopifyCancelPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const shopifyOrderId = String(payload.order_id ?? payload.id);
  if (!shopifyOrderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Find the order in our database
  const order = await db.findOrderByStoreAndShopifyId(store.id, shopifyOrderId);
  if (!order) {
    return NextResponse.json({ ok: true, message: "Order not tracked by platform" });
  }

  // Check if there's a pending commission for this order
  const commission = await db.findCommissionByOrderId(order.id);
  if (commission && commission.status === "pending") {
    await db.updateCommissionStatus(commission.id, "cancelled");
    console.log(`[webhook/refunds] cancelled commission ${commission.id} for order ${shopifyOrderId}`);
  }

  return NextResponse.json({ ok: true, cancelledCommission: commission?.id ?? null });
}
