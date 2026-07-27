import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const stats = await db.getMarketplaceStats();
  return NextResponse.json(stats);
}
