import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);

  let totalClicks = 0;
  let totalPending = 0;
  let totalPaid = 0;
  let totalOrders = 0;

  for (const aff of affiliates) {
    const [clicks, commissions] = await Promise.all([
      db.countClicksByAffiliateId(aff.id),
      db.findCommissionsByAffiliateId(aff.id),
    ]);
    totalClicks   += clicks;
    totalPending  += commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    totalPaid     += commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    totalOrders   += commissions.length;
  }

  return NextResponse.json({ totalClicks, totalPending, totalPaid, totalOrders });
}
