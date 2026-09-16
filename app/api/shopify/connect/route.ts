/**
 * POST /api/shopify/connect
 *
 * Step 1 of multi-brand Shopify OAuth.
 * Any brand (creator user) can connect their own Shopify store.
 *
 * Two modes:
 *  1. Native OAuth  — SHOPIFY_API_KEY + SHOPIFY_API_SECRET are set in env
 *  2. Demo / dev    — env vars absent → store saved directly with accessToken=null
 *
 * Body: { shopDomain: "my-store" }  (just the subdomain, no .myshopify.com)
 *
 * Response:
 *  { redirectUrl: "https://..." }  → client should navigate to this URL (Shopify OAuth)
 *  { store: {...}, redirectUrl: null } → dev mode, store created directly
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getShopifyRedirectUri, normalizeShopifyShopDomain } from "@/lib/shopify";
import { z } from "zod";

const schema = z.object({
  shopDomain: z.string().min(2, "Enter a valid Shopify store name."),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Only brand accounts can connect Shopify stores
  const { db } = await import("@/lib/db");
  const user = await db.findUserById(session.userId);
  if (!user || user.role !== "brand") {
    return NextResponse.json({ error: "Only brand accounts can connect Shopify stores." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const shopName = normalizeShopifyShopDomain(parsed.data.shopDomain);
  if (!shopName) {
    return NextResponse.json({ error: "Use a valid .myshopify.com store address." }, { status: 400 });
  }
  const shopDomain = `${shopName}.myshopify.com`;
  const apiKey     = process.env.SHOPIFY_API_KEY;
  const redirectUri = getShopifyRedirectUri(process.env.NEXT_PUBLIC_APP_URL, req.url);
  const scopes     = process.env.SHOPIFY_SCOPES ?? "read_orders,read_products,write_discounts,write_script_tags";

  if (!apiKey || !process.env.SHOPIFY_API_SECRET) {
    return NextResponse.json(
      { error: "Shopify API credentials are not configured. Add SHOPIFY_API_KEY and SHOPIFY_API_SECRET to the deployment." },
      { status: 503 }
    );
  }

  // Bind this authorization response to the initiating browser with an
  // HttpOnly state cookie. The callback verifies both the cookie and state.
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const state = Buffer.from(
    JSON.stringify({ nonce, shopDomain })
  ).toString("base64url");

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(apiKey)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  const response = NextResponse.json({ redirectUrl: authUrl });
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/shopify/callback",
    maxAge: 10 * 60,
  });
  return response;
}
