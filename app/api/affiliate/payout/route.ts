import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
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

  const pending = await db.findPendingCommissionsByAffiliateAndProgram(affiliate.id, program.id);
  const total = pending.reduce((s, c) => s + c.amount, 0);

  if (total < program.payoutThreshold) {
    return NextResponse.json({
      error: `Minimum payout threshold is $${program.payoutThreshold.toFixed(2)}. You have $${total.toFixed(2)} pending.`,
    }, { status: 400 });
  }

  let stripeTransferId: string | null = null;

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
    const amountCents = Math.round(total * 100);
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: program.currency.toLowerCase(),
          destination: user.stripeAccountId,
          description: `inBFF payout — ${program.name}`,
          metadata: { affiliateId: affiliate.id, programId: program.id },
        },
        {
          // Same idempotency intent as the brand-initiated payout routes —
          // a retried request pays out this exact batch once, not twice.
          // Hashed (rather than joined raw) so the key stays well under
          // Stripe's length limit no matter how many commissions batch in.
          idempotencyKey: `affiliate-payout-${createHash("sha256")
            .update(pending.map(c => c.id).sort().join(","))
            .digest("hex")}`,
        }
      );
      stripeTransferId = transfer.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe transfer failed.";
      return NextResponse.json({ error: `Payment failed: ${msg}` }, { status: 502 });
    }
  }
  // No STRIPE_SECRET_KEY → manual mode: mark paid without a transfer,
  // same explicit behavior as the brand-initiated payout routes.

  // Mark all pending commissions as paid
  const updated = await Promise.all(
    pending.map(c => db.markCommissionPaid(c.id, stripeTransferId))
  );

  return NextResponse.json({ paid: updated.length, total, stripeTransferId });
}
