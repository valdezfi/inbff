import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const programs = await db.findActivePrograms({
    category: sp.get("category")   ?? undefined,
    minRate:  sp.get("minRate")    ? Number(sp.get("minRate"))  : undefined,
    type:     sp.get("type")       ?? undefined,
    sort:     sp.get("sort")       ?? "recent",
    search:   sp.get("search")     ?? undefined,
    page:     sp.get("page")       ? Number(sp.get("page"))     : 1,
  });

  return NextResponse.json(programs);
}
