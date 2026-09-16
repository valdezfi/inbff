import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import Stripe from "stripe";

const schema = z.object({ programId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "programId is required." }, { status: 400 });

  const user = await db.findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);
  const affiliate = affiliates.find(a => a.programId === parsed.data.programId);
  if (!affiliate) return NextResponse.json({ error: "Not a member of this program." }, { status: 404 });

  const program = await db.findProgramById(parsed.data.programId);
  if (!program) return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const pending = (await db.findPendingCommissionsByAffiliateAndProgram(affiliate.id, program.id))
    .filter(commission => Number.isFinite(commission.amount) && Math.round(commission.amount * 100) > 0);
  const total = pending.reduce((s, c) => s + c.amount, 0);

  if (pending.length === 0 || total <= 0 || total < program.payoutThreshold) {
    return NextResponse.json({
      error: `Minimum payout threshold is $${program.payoutThreshold.toFixed(2)}. You have $${total.toFixed(2)} pending.`,
    }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Online payouts are not configured. Contact the brand to arrange payment; your earnings remain pending." }, { status: 409 });
  }
  let paid = 0;
  let paidTotal = 0;

  if (process.env.STRIPE_SECRET_KEY) {
    // Stripe is configured platform-wide — a transfer is required, not
    // optional. Without this check, an affiliate who never connected
    // Stripe could still hit this endpoint directly and have every pending
    // commission marked "paid" with no money ever moving.
    if (!user.stripeAccountId) {
      return NextResponse.json(
        { error: "Connect your Stripe account before requesting a payout." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion,
    });
    for (const commission of pending) {
    const amountCents = Math.round(commission.amount * 100);
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: program.currency.toLowerCase(),
          destination: user.stripeAccountId,
          description: `inBFF commission payout — ${program.name}`,
          metadata: { commissionId: commission.id, affiliateId: affiliate.id, programId: program.id },
        },
        {
          idempotencyKey: `payout-${commission.id}`,
        }
      );
      await db.markCommissionPaid(commission.id, transfer.id);
      paid++;
      paidTotal += commission.amount;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe transfer failed.";
      const recovery = paid > 0
        ? ` ${paid} commission(s) were paid. Ask the brand to settle the remaining balance if it is below the payout threshold.`
        : '';
      return NextResponse.json({ error: `Payment failed: ${msg}.${recovery}`, paid, total: paidTotal }, { status: 502 });
    }
    }
  }
  return NextResponse.json({ paid, total: Math.round(paidTotal * 100) / 100 });
}
