/**
 * POST /api/shopify/unified/connect
 *
 * Returns the Unified.to OAuth URL so the brand can connect their Shopify store
 * without the platform needing a Shopify Partner app.
 *
 * Required env vars:
 *   NEXT_PUBLIC_UNIFIED_WORKSPACE_ID
 *   NEXT_PUBLIC_APP_URL
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const workspaceId = process.env.NEXT_PUBLIC_UNIFIED_WORKSPACE_ID || process.env.UNIFIED_WORKSPACE_ID;
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || req.nextUrl.origin || "http://localhost:3000";

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Unified.to workspace not configured. Set NEXT_PUBLIC_UNIFIED_WORKSPACE_ID." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({})) as { shopDomain?: string };

  // Encode userId (+ optional shopDomain hint) in state for the callback
  const state = Buffer.from(
    JSON.stringify({ userId: session.userId, shopDomain: body.shopDomain ?? "" })
  ).toString("base64url");

  const callbackUrl      = `${appUrl}/api/shopify/unified/callback`;
  const errorRedirectUrl = `${appUrl}/dashboard/connect-shopify?error=unified-integration-disabled`;

  const redirectUrl =
    `https://api.unified.to/unified/integration/auth/${workspaceId}/shopify` +
    `?redirect=true` +
    `&success_redirect=${encodeURIComponent(`${callbackUrl}?state=${state}`)}` +
    `&failure_redirect=${encodeURIComponent(errorRedirectUrl)}` +
    `&error_redirect=${encodeURIComponent(errorRedirectUrl)}`;

  return NextResponse.json({ redirectUrl });
}
