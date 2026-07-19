/**
 * Step 2 of Shopify OAuth — the callback.
 *
 * GET /api/shopify/callback?code=...&hmac=...&state=...&shop=...
 *
 * Shopify redirects here after the merchant approves the app.
 * We:
 *   1. Verify the HMAC signature so we know the request is genuinely from Shopify.
 *   2. Decode the `state` param to retrieve the userId and shopDomain.
 *   3. Exchange the temporary `code` for a permanent access token.
 *   4. Save the store (+ token) in the database.
 *   5. Register the orders/create webhook so Shopify will notify us of new orders.
 *   6. Redirect the merchant back to their dashboard.
 *
 * Required env vars:
 *   SHOPIFY_API_KEY      SHOPIFY_API_SECRET   SHOPIFY_REDIRECT_URI
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop     = searchParams.get("shop") ?? "";
  const code     = searchParams.get("code") ?? "";
  const hmac     = searchParams.get("hmac") ?? "";
  const state    = searchParams.get("state") ?? "";

  // ── 1. Verify HMAC ────────────────────────────────────────────────────────
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=not-configured", req.url)
    );
  }

  // Build the message: all query params EXCEPT hmac, sorted, joined with &
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac") params[key] = value;
  });
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const digest = createHmac("sha256", apiSecret).update(message).digest("hex");
  if (digest !== hmac) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=invalid-hmac", req.url)
    );
  }

  // ── 2. Decode state ───────────────────────────────────────────────────────
  let userId: string;
  let shopDomain: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId = decoded.userId;
    shopDomain = decoded.shopDomain;
    if (!userId || !shopDomain || shopDomain !== shop) throw new Error("state mismatch");
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=invalid-state", req.url)
    );
  }

  // ── 3. Exchange code for access token ─────────────────────────────────────
  const apiKey = process.env.SHOPIFY_API_KEY!;
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=token-exchange-failed", req.url)
    );
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

  // ── 4. Upsert store ───────────────────────────────────────────────────────
  const store = await db.upsertStore({
    id: nanoid(),
    userId,
    shopDomain: shop,
    accessToken,
  });

  // ── 5. Register orders/create webhook ────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl) {
    await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic: "orders/create",
          address: `${appUrl}/api/webhooks/orders`,
          format: "json",
        },
      }),
    });
    // Non-fatal if registration fails (duplicate webhooks return 422, that's fine)
  }

  // ── 6. Redirect back to dashboard ─────────────────────────────────────────
  return NextResponse.redirect(
    new URL(`/dashboard/programs/new?store=${store.id}`, req.url)
  );
}
