import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({ programId: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "programId required." }, { status: 400 });

  const program = await db.findProgramById(parsed.data.programId);
  if (!program || program.userId !== session.userId)
    return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const commissions = await db.findCommissionsByProgramIds([program.id]);
  const pending = commissions.filter(c => c.status === "pending");
  if (pending.length === 0) return NextResponse.json({ paid: 0 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey
    ? new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion })
    : null;

  // Fetch affiliates once (outside the loop) to avoid N+1 queries
  const affiliates = await db.findAffiliatesByProgramId(program.id);

  let paid = 0;
  let skipped = 0; // no connected Stripe account — never marked paid
  let failed = 0;  // transfer attempted but errored — never marked paid
  for (const commission of pending) {
    let transferId: string | null = null;

    if (stripe) {
      const aff = affiliates.find(a => a.id === commission.affiliateId);
      const user = aff?.userId ? await db.findUserById(aff.userId) : null;

      if (!user?.stripeAccountId) {
        // No connected Stripe account — do NOT mark paid, or the affiliate
        // would show as paid while never actually receiving a transfer.
        skipped++;
        continue;
      }

      try {
        const t = await stripe.transfers.create(
          {
            amount:      Math.round(commission.amount * 100),
            currency:    program.currency.toLowerCase(),
            destination: user.stripeAccountId,
            description: `inBFF bulk payout — ${program.name}`,
            metadata: {
              commissionId: commission.id,
              programId:    program.id,
              affiliateId:  commission.affiliateId,
            },
          },
          {
            // Same key scheme as the single-payout route — dedupes a retried
            // bulk-pay request (and a commission already transferred via the
            // single-payout endpoint) instead of double-paying the affiliate.
            idempotencyKey: `payout-${commission.id}`,
          }
        );
        transferId = t.id;
      } catch (e) {
        console.error("Stripe transfer error:", e);
        failed++;
        continue;
      }
    }
    // No STRIPE_SECRET_KEY → manual mode: mark paid without a transfer,
    // same explicit behavior as the single-payout route.

    await db.markCommissionPaid(commission.id, transferId);
    paid++;
  }

  return NextResponse.json({ paid, skipped, failed });
}
