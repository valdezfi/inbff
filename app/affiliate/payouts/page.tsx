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

  // `user.stripeAccountId` is set the instant Stripe creates the Express
  // account object — before the affiliate has actually filled out any of
  // Stripe's hosted onboarding form. Treating that alone as "connected"
  // shows a green "✓ connected" badge for an account that can't receive
  // a payout yet, so the *first* real transfer attempt fails with a
  // confusing Stripe error and the whole feature reads as broken. Ask
  // Stripe whether the account can actually receive payouts before
  // reporting it as connected.
  let stripeConnected = false;
  if (hasStripe && user?.stripeAccountId) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-06-24.dahlia" as import("stripe").Stripe.LatestApiVersion,
      });
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      stripeConnected = !!account.payouts_enabled;
    } catch (e) {
      console.error("[affiliate payouts] failed to check Stripe account status:", e);
    }
  }

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
      stripeConnected={stripeConnected}
      hasStripe={hasStripe}
    />
  );
}
