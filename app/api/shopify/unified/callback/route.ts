/**
 * GET /api/shopify/unified/callback
 *
 * Handles the redirect from Unified.to after a brand connects their Shopify store.
 * Unified.to returns: ?id={connectionId}&workspace_id=...
 *
 * We store the connectionId as the store's accessToken (Unified.to manages
 * the actual Shopify access token on their end; we proxy all API calls through them).
 *
 * Required env vars:
 *   UNIFIED_API_KEY                    — Unified.to API key
 *   NEXT_PUBLIC_UNIFIED_WORKSPACE_ID   — Unified.to workspace ID
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Handle error from Unified.to (e.g. integration not enabled) ──
  // Unified.to may redirect with ?error=... when Shopify integration is not enabled
  if (searchParams.has("error") || searchParams.has("error_description")) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=unified-integration-disabled", req.url)
    );
  }

  const connectionId = searchParams.get("id") ?? "";
  const state        = searchParams.get("state") ?? "";

  if (!connectionId) {
    return NextResponse.redirect(
      new URL("/dashboard/connect-shopify?error=no-connection-id", req.url)
    );
  }

  // Decode state to get userId + shopDomain
  let userId: string;
  let shopDomain: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId     = decoded.userId;
    shopDomain = decoded.shopDomain;
    if (!userId || !shopDomain) throw new Error("missing fields");
  } catch {
    // Fallback: try to get session from cookie
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(
        new URL("/dashboard/connect-shopify?error=invalid-state", req.url)
      );
    }
    userId     = session.userId;
    shopDomain = `unified-${connectionId.slice(0, 8)}.myshopify.com`; // placeholder
  }

  // Fetch the actual shop domain from Unified.to
  const unifiedKey = process.env.UNIFIED_API_KEY;
  if (unifiedKey) {
    try {
      const res = await fetch(
        `https://api.unified.to/unified/connection/${connectionId}`,
        { headers: { Authorization: `Bearer ${unifiedKey}` } }
      );
      if (res.ok) {
        const conn = await res.json() as { external_xref?: string; integration_type?: string };
        if (conn.external_xref) {
          // external_xref is the myshopify.com domain
          shopDomain = conn.external_xref.includes(".myshopify.com")
            ? conn.external_xref
            : `${conn.external_xref}.myshopify.com`;
        }
      }
    } catch (e) {
      console.error("[unified callback] failed to fetch connection details:", e);
    }
  }

  // Upsert store — accessToken holds the Unified.to connectionId.
  // Scoped to this user so reconnecting never collides with another brand's
  // store row that happens to share the same shop domain.
  const existingStore = await db.findStoreByUserAndDomain(userId, shopDomain).catch(() => null);
  const store = await db.upsertStore({
    id:            existingStore?.id ?? nanoid(),
    userId,
    shopDomain,
    accessToken:   `unified:${connectionId}`, // prefixed so we know it's a Unified token
    webhookSecret: null,
  });

  // Sync products via Unified.to in the background
  if (unifiedKey) {
    syncUnifiedProducts(store.id, connectionId, unifiedKey).catch(err =>
      console.error("[unified] product sync failed:", err)
    );
  }

  return NextResponse.redirect(new URL(`/dashboard/programs/new?storeId=${store.id}`, req.url));
}

async function syncUnifiedProducts(
  storeId: string,
  connectionId: string,
  apiKey: string
): Promise<void> {
  const { nanoid } = await import("nanoid");
  const { db }     = await import("@/lib/db");

  const res = await fetch(
    `https://api.unified.to/commerce/${connectionId}/item?limit=100`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) return;

  const items = await res.json() as Array<{
    id: string;
    name?: string;
    title?: string;
    media?: { url?: string }[];
    variants?: { price?: number; currency?: string }[];
    raw?: { handle?: string };
  }>;

  await db.upsertProducts(
    items.map(item => ({
      id:               nanoid(),
      storeId,
      shopifyProductId: String(item.id),
      title:            item.name ?? item.title ?? "Untitled",
      imageUrl:         item.media?.[0]?.url ?? null,
      price:            item.variants?.[0]?.price ?? null,
      handle:           item.raw?.handle ?? String(item.id),
    }))
  );
}
