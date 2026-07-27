import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ programId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { programId } = await params;
  const program = await db.findProgramById(programId);
  if (!program || program.status !== "active")
    return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const [stores, affiliates] = await Promise.all([
    db.findStoresByUserId(program.userId),
    db.findAffiliatesByProgramId(programId),
  ]);
  const store = stores.find(s => s.id === program.storeId);

  return NextResponse.json({
    ...program,
    shopDomain: store?.shopDomain ?? "",
    affiliateCount: affiliates.filter(a => a.status === "active").length,
  });
}
