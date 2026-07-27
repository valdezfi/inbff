import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { syncProducts, registerOrderWebhook } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop  = searchParams.get("shop")  ?? "";
  const code  = searchParams.get("code")  ?? "";
  const hmac  = searchParams.get("hmac")  ?? "";
  const state = searchParams.get("state") ?? "";

  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) return NextResponse.redirect(new URL("/dashboard/connect-shopify?error=not-configured", req.url));

  // Verify HMAC
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => { if (k !== "hmac") params[k] = v; });
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const digest = createHmac("sha256", apiSecret).update(message).digest("hex");
  if (digest !== hmac) return NextResponse.redirect(new URL("/dashboard/connect-shopify?error=invalid-hmac", req.url));

  // Decode state
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId = decoded.userId;
    if (!userId || decoded.shopDomain !== shop) throw new Error("mismatch");
  } catch {
    return NextResponse.redirect(new URL("/dashboard/connect-shopify?error=invalid-state", req.url));
  }

  // Exchange code for token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: apiSecret, code }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/dashboard/connect-shopify?error=token-exchange-failed", req.url));
  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  // Upsert store
  const store = await db.upsertStore({ id: nanoid(), userId, shopDomain: shop, accessToken });

  // Register webhook + sync products (non-blocking)
  Promise.all([
    registerOrderWebhook(store),
    syncProducts(store),
  ]).catch(err => console.error("[shopify callback] post-auth tasks failed:", err));

  return NextResponse.redirect(new URL(`/dashboard/programs/new`, req.url));
}
