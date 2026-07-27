import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);
  const page  = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const limit = 20;

  // Gather all commissions across all programs
  const all: Array<{
    id: string; amount: number; rate: number; status: string;
    createdAt: string; paidAt: string | null; stripeTransferId: string | null;
    programName: string; orderId: string;
  }> = [];

  for (const aff of affiliates) {
    const commissions = await db.findCommissionsByAffiliateId(aff.id);
    for (const c of commissions) {
      const program = await db.findProgramById(c.programId);
      all.push({ ...c, programName: program?.name ?? "—" });
    }
  }

  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = all.length;
  const items = all.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ items, total, page, hasMore: page * limit < total });
}
