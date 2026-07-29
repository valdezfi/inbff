import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/affiliate/stats
 *
 * Returns aggregate totals for the logged-in creator across all their programs.
 * Fixed: parallel batch fetching instead of sequential N+1 loop.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);
  if (affiliates.length === 0) {
    return NextResponse.json({ totalClicks: 0, totalPending: 0, totalPaid: 0, totalOrders: 0 });
  }

  // Fetch all in parallel — one batch per data type instead of N+1
  const [clickCounts, commissionSets] = await Promise.all([
    Promise.all(affiliates.map(a => db.countClicksByAffiliateId(a.id))),
    Promise.all(affiliates.map(a => db.findCommissionsByAffiliateId(a.id))),
  ]);

  let totalClicks  = 0;
  let totalPending = 0;
  let totalPaid    = 0;
  let totalOrders  = 0;

  for (let i = 0; i < affiliates.length; i++) {
    totalClicks  += clickCounts[i];
    const comms   = commissionSets[i];
    totalOrders  += comms.length;
    totalPending += comms.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    totalPaid    += comms.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  }

  return NextResponse.json({ totalClicks, totalPending, totalPaid, totalOrders });
}
