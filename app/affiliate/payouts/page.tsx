import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AffiliatePayoutClient from "./AffiliatePayoutClient";

export default async function AffiliatePayoutsPage() {
  const session  = await getSession();
  const user     = await db.findUserById(session!.userId);
  const affiliates = await db.findAffiliatesByUserId(session!.userId);

  const programs = await Promise.all(
    affiliates.map(async aff => {
      const program = await db.findProgramById(aff.programId);
      const commissions = await db.findCommissionsByAffiliateId(aff.id);
      const pending = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
      const paid    = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
      return { aff, program, pending, paid };
    })
  );

  const hasStripe = !!process.env.STRIPE_SECRET_KEY;

  return (
    <AffiliatePayoutClient
      programs={programs.map(p => ({
        affiliateId:    p.aff.id,
        programId:      p.aff.programId,
        programName:    p.program?.name ?? "—",
        commissionRate: p.program?.commissionRate ?? 0,
        payoutThreshold:p.program?.payoutThreshold ?? 50,
        currency:       p.program?.currency ?? "USD",
        pending:        p.pending,
        paid:           p.paid,
      }))}
      stripeConnected={!!user?.stripeAccountId}
      hasStripe={hasStripe}
    />
  );
}
