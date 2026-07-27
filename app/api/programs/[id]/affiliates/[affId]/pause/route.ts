import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; affId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id: programId, affId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(programId);
  if (!program || program.userId !== session.userId)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const affiliates = await db.findAffiliatesByProgramId(programId);
  const affiliate = affiliates.find(a => a.id === affId);
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const newStatus = affiliate.status === "active" ? "paused" : "active";
  await db.updateAffiliateStatus(affId, newStatus);
  return NextResponse.json({ id: affId, status: newStatus });
}
