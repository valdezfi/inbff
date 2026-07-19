/**
 * Step 1 of Shopify OAuth.
 *
 * POST /api/shopify/connect
 * Body: { shopDomain: "my-store" }   (just the store name, not the full domain)
 *
 * Redirects the merchant to Shopify's authorization screen.
 * After the merchant approves, Shopify calls /api/shopify/callback with a
 * temporary code that we exchange for a permanent access token.
 *
 * Required env vars:
 *   SHOPIFY_API_KEY        — from Shopify Partners → App setup
 *   SHOPIFY_REDIRECT_URI   — must match the URI registered in the app
 *   SHOPIFY_SCOPES         — comma-separated list of scopes, e.g. "read_orders"
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  shopDomain: z
    .string()
    .min(3, "Enter a valid store name.")
    .regex(/^[a-zA-Z0-9-]+$/, "Use just the store name, e.g. 'my-shop'"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const shopDomain = `${parsed.data.shopDomain}.myshopify.com`;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
  const scopes = process.env.SHOPIFY_SCOPES ?? "read_orders";

  if (!apiKey || !redirectUri) {
    return NextResponse.json(
      { error: "Shopify integration is not configured. Set SHOPIFY_API_KEY and SHOPIFY_REDIRECT_URI." },
      { status: 503 }
    );
  }

  // Generate a random nonce to prevent CSRF during the OAuth callback.
  // We embed the userId and shop in the state so the callback can identify
  // the user without a separate session lookup.
  const nonce = Math.random().toString(36).slice(2);
  const state = Buffer.from(
    JSON.stringify({ nonce, userId: session.userId, shopDomain })
  ).toString("base64url");

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(apiKey)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.json({ redirectUrl: authUrl });
}
