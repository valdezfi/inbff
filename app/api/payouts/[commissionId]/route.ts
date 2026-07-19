/**
 * POST /api/payouts/:commissionId
 *
 * Marks a commission as paid by executing a real Stripe transfer to the
 * affiliate's connected Stripe account, then persisting the result.
 *
 * How Stripe Connect works here:
 *   - Each affiliate completes the Stripe Connect onboarding flow (Express or
 *     Standard) and you save their `stripe_account_id` on their affiliate row.
 *   - When you pay out, you create a Transfer from your platform account to
 *     their connected account. Stripe moves the money instantly.
 *
 * Required env var:
 *   STRIPE_SECRET_KEY  — your platform's Stripe secret key (sk_live_... or sk_test_...)
 *
 * If STRIPE_SECRET_KEY is not set, the route falls back to a simple DB-only
 * status flip so the app remains functional without Stripe configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  const { commissionId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Load commission and verify ownership
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
  if (process.env.STRIPE_SECRET_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe") as typeof import("stripe");
    const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
    });

    // Look up the affiliate's Stripe connected account ID.
    // In a full implementation you'd store this on the affiliate record after
    // they complete Stripe Connect onboarding. Here we query a hypothetical
    // column — adjust as needed.
    // For now we require the affiliate's stripeAccountId to be stored somewhere
    // accessible. If it's missing we skip the actual transfer but still mark paid.
    const affiliate = (await db.findAffiliatesByProgramId(commission.programId)).find(
      (a) => a.id === commission.affiliateId
    );

    // stripeAccountId would live on the affiliate record once you add
    // Connect onboarding. Type cast to access it if present.
    const stripeAccountId = (affiliate as unknown as Record<string, string | undefined>)
      ?.stripeAccountId;

    if (stripeAccountId) {
      // Amount in the smallest currency unit (cents for USD)
      const amountInCents = Math.round(commission.amount * 100);

      try {
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: "usd",
          destination: stripeAccountId,
          description: `Commission payout — program ${commission.programId}`,
          metadata: {
            commissionId: commission.id,
            programId: commission.programId,
            affiliateId: commission.affiliateId,
          },
        });
        stripeTransferId = transfer.id;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Stripe transfer failed.";
        console.error("Stripe transfer error:", message);
        return NextResponse.json(
          { error: `Payment failed: ${message}` },
          { status: 502 }
        );
      }
    }
    // If no stripeAccountId yet, we fall through and mark paid without a
    // transfer (useful during onboarding / testing).
  }

  // ── Mark paid in DB ───────────────────────────────────────────────────────
  const updated = await db.markCommissionPaid(commissionId, stripeTransferId);
  if (!updated) {
    return NextResponse.json({ error: "Commission not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
