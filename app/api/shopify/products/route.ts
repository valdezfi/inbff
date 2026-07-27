import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId is required." }, { status: 400 });

  // Verify store belongs to user
  const stores = await db.findStoresByUserId(session.userId);
  if (!stores.find(s => s.id === storeId)) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const products = await db.findProductsByStoreId(storeId);
  return NextResponse.json(products);
}
