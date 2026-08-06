import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { syncProducts, syncUnifiedProducts } from "@/lib/shopify";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({ storeId: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "storeId is required." }, { status: 400 });

  const stores = await db.findStoresByUserId(session.userId);
  const store = stores.find(s => s.id === parsed.data.storeId);
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

  if (!store.accessToken) {
    return NextResponse.json({ error: "Store has no access token — complete OAuth first." }, { status: 400 });
  }

  // Unified.to-connected stores hold `unified:<connectionId>` as their
  // "access token" — that's not a real Shopify token, so it must go
  // through the Unified.to product API, never the native Shopify sync.
  const count = store.accessToken.startsWith("unified:")
    ? await syncUnifiedProducts(store)
    : await syncProducts(store);
  return NextResponse.json({ synced: count });
}
