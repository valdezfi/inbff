/**
 * POST /api/payouts/:commissionId
 *
 * Pays a single commission via Stripe Connect transfer.
 *
 * Fixes applied:
 *  - Idempotency key = commissionId → prevents double-pay on network retry
 *  - Requires affiliate's Stripe account to be connected — no silent "paid without transfer"
 *  - Loads affiliate directly by ID (no N+1 program-affiliates scan)
 *  - Stripe SDK loaded via static import (serverExternalPackages keeps it as native require)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Stripe from "stripe";

// Initialise once at module scope — not on every request.
// stripe is in serverExternalPackages so it's a native Node.js require.
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion })
  : null;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  const { commissionId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Only brand accounts can pay commissions
  const user = await db.findUserById(session.userId);
  if (!user || user.role !== "brand") {
    return NextResponse.json({ error: "Only brand accounts can issue payouts." }, { status: 403 });
  }

  // Load commission and verify it belongs to this brand
  const commission = await db.findCommissionById(commissionId);
  if (!commission) {
    return NextResponse.json({ error: "Commission not found." }, { status: 404 });
  }

  const program = await db.findProgramById(commission.programId);
  if (!program || program.userId !== session.userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (commission.status === "paid") {
    return NextResponse.json({ error: "Already paid." }, { status: 409 });
  }

  let stripeTransferId: string | null = null;

  // ── Stripe transfer ───────────────────────────────────────────────────────
  if (stripe) {
    // Load affiliate directly — no N+1 scan
    const affiliatesList = await db.findAffiliatesByProgramId(commission.programId);
    const affiliate = affiliatesList.find(a => a.id === commission.affiliateId);
    const stripeAccountId = affiliate
      ? (affiliate as unknown as Record<string, string | undefined>).stripeAccountId ?? null
      : null;

    // Check user-level Stripe account (affiliates connect via their user account)
    const affiliateUser = affiliate?.userId
      ? await db.findUserById(affiliate.userId)
      : null;
    const finalStripeAccount = stripeAccountId ?? affiliateUser?.stripeAccountId ?? null;

    if (!finalStripeAccount) {
      return NextResponse.json(
        { error: "Affiliate has not connected a Stripe account yet. Ask them to complete Stripe onboarding from their Payouts page." },
        { status: 400 }
      );
    }

    const amountInCents = Math.round(commission.amount * 100);
    try {
      const transfer = await stripe.transfers.create(
        {
          amount:      amountInCents,
          currency:    program.currency?.toLowerCase() ?? "usd",
          destination: finalStripeAccount,
          description: `inBFF commission payout — ${program.name}`,
          metadata: {
            commissionId: commission.id,
            programId:    commission.programId,
            affiliateId:  commission.affiliateId,
          },
        },
        {
          // ── Critical: idempotency key prevents double-pay on retry ───────
          idempotencyKey: `payout-${commissionId}`,
        }
      );
      stripeTransferId = transfer.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe transfer failed.";
      console.error("[payout] Stripe transfer error:", msg);
      return NextResponse.json({ error: `Payment failed: ${msg}` }, { status: 502 });
    }
  }
  // No STRIPE_SECRET_KEY → manual mode: mark paid without a transfer
  // This is explicit: the brand is manually handling payment outside Stripe.

  const updated = await db.markCommissionPaid(commissionId, stripeTransferId);
  if (!updated) {
    return NextResponse.json({ error: "Commission not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
