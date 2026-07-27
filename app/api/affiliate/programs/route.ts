import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await db.findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);

  const enriched = await Promise.all(
    affiliates.map(async (aff) => {
      const program = await db.findProgramById(aff.programId);
      const [clicks, commissions, stores] = await Promise.all([
        db.countClicksByAffiliateId(aff.id),
        db.findCommissionsByAffiliateId(aff.id),
        program ? db.findStoresByUserId(program.userId) : [],
      ]);
      const store = stores.find(s => s.id === program?.storeId);
      const pending = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
      const paid    = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
      const orders  = commissions.length;
      const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      return {
        affiliateId:    aff.id,
        referralCode:   aff.referralCode,
        referralUrl:    `${appUrl}/r/${aff.referralCode}`,
        status:         aff.status,
        joinedAt:       aff.joinedAt,
        program: program ? {
          id:             program.id,
          name:           program.name,
          commissionRate: program.commissionRate,
          payoutThreshold:program.payoutThreshold,
          currency:       program.currency,
          status:         program.status,
          shopDomain:     store?.shopDomain ?? "",
        } : null,
        clicks, orders, pending, paid,
      };
    })
  );

  return NextResponse.json(enriched);
}
