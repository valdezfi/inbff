/**
 * GET /api/shopify/callback
 *
 * Step 2 of Shopify OAuth. Shopify redirects here after the merchant approves.
 * - Verifies HMAC signature on all query params
 * - Exchanges the temporary code for a permanent access token
 * - Upserts the store record (one per brand per shopDomain)
 * - Registers the orders/create webhook with a per-store secret
 * - Syncs the product catalog in the background
 * - Redirects to the program setup wizard
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { syncProducts, registerOrderWebhook, verifyOAuthHmac } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop  = searchParams.get("shop")  ?? "";
  const code  = searchParams.get("code")  ?? "";
  const state = searchParams.get("state") ?? "";

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=not-configured", req.url)
    );
  }

  // ── Verify OAuth HMAC ──────────────────────────────────────────────────────
  if (!verifyOAuthHmac(searchParams, apiSecret)) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=invalid-hmac", req.url)
    );
  }

  // ── Decode state (userId + shopDomain + nonce) ─────────────────────────────
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId = decoded.userId;
    if (!userId || decoded.shopDomain !== shop) throw new Error("state mismatch");
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=invalid-state", req.url)
    );
  }

  // ── Exchange code for permanent access token ───────────────────────────────
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.SHOPIFY_API_KEY,
      client_secret: apiSecret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[shopify callback] token exchange failed:", tokenRes.status, await tokenRes.text());
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=token-exchange-failed", req.url)
    );
  }

  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  // ── Upsert store (preserves existing webhookSecret if reconnecting) ────────
  // Scoped to this user — a global domain lookup would collide with (and
  // hijack) another brand's store row if that store happens to share a
  // shop domain already connected under a different account.
  const existingStore = await db.findStoreByUserAndDomain(userId, shop).catch(() => null);
  const storeId = existingStore?.id ?? nanoid();

  const store = await db.upsertStore({
    id:            storeId,
    userId,
    shopDomain:    shop,
    accessToken,
    webhookSecret: existingStore?.webhookSecret ?? null, // preserved; registerOrderWebhook may update
  });

  // ── Register webhook + sync products (background, non-blocking) ───────────
  Promise.all([
    registerOrderWebhook(store),
    syncProducts(store),
  ]).catch(err => console.error("[shopify callback] post-auth tasks failed:", err));

  // ── Redirect to program creation wizard ───────────────────────────────────
  return NextResponse.redirect(new URL(`/dashboard/programs/new?storeId=${store.id}`, req.url));
}
