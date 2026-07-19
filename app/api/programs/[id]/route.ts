import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [affiliates, orders, commissions] = await Promise.all([
    db.findAffiliatesByProgramId(id),
    db.findOrdersByProgramId(id),
    db.findCommissionsByProgramId(id),
  ]);

  return NextResponse.json({ program, affiliates, orders, commissions });
}
