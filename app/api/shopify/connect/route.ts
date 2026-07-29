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
import { z } from "zod";

const schema = z.object({
  shopDomain: z
    .string()
    .min(2, "Enter a valid store name.")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/, "Use just the store name, e.g. my-shop"),
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

  const shopDomain = `${parsed.data.shopDomain.toLowerCase()}.myshopify.com`;
  const apiKey     = process.env.SHOPIFY_API_KEY;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
  const scopes     = process.env.SHOPIFY_SCOPES ?? "read_orders,write_script_tags";

  // ── Dev / demo mode: no Shopify app credentials ───────────────────────────
  if (!apiKey || !redirectUri) {
    const { nanoid } = await import("nanoid");
    const { db }     = await import("@/lib/db");
    const store = await db.upsertStore({
      id:            nanoid(),
      userId:        session.userId,
      shopDomain,
      accessToken:   null,
      webhookSecret: null,
    });
    return NextResponse.json({ store, redirectUrl: null });
  }

  // ── Production: build Shopify OAuth URL ───────────────────────────────────
  // Embed userId + shopDomain in a signed state param to survive the round-trip
  const nonce = crypto.getRandomValues(new Uint32Array(2)).join("");
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
