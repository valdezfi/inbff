/**
 * POST /api/webhooks/stripe
 *
 * Handles inbound Stripe Connect webhook events.
 *
 * Events handled:
 *   transfer.failed        — mark commission back to pending so it can be retried
 *   account.updated        — log when an affiliate's payout capability changes
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   — from `stripe listen --forward-to ...` or the Stripe dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripeKey     = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion })
  : null;

// Next.js App Router requires the raw body for signature verification —
// disable body parsing via the segment config.
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook signature verification failed.";
      console.error("[stripe webhook] signature error:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    // No webhook secret configured — accept unsigned events (dev / test only).
    // Log a warning so it's obvious this must be set before production.
    console.warn("[stripe webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification. Set it before going to production.");
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      // ── Transfer failed — revert the commission to pending so the brand
      //    can retry the payout from the dashboard. ─────────────────────────
      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        const commissionId = transfer.metadata?.commissionId;
        if (commissionId) {
          await revertCommissionToPending(commissionId);
          console.log(`[stripe webhook] transfer.failed — reverted commission ${commissionId} to pending`);
        }
        break;
      }

      // ── Account updated — log payout capability changes so operators
      //    can see when an affiliate finishes onboarding. ──────────────────
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log(
          `[stripe webhook] account.updated — id=${account.id} ` +
          `payouts_enabled=${account.payouts_enabled} ` +
          `details_submitted=${account.details_submitted}`
        );
        break;
      }

      default:
        // Acknowledge and ignore unhandled event types.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Internal handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Helper: revert a commission from paid → pending ───────────────────────────
// We call this when a Stripe transfer fails after we've already marked the
// commission as paid. This prevents the brand thinking they paid an affiliate
// who actually never received money.
async function revertCommissionToPending(commissionId: string): Promise<void> {
  try {
    await db.revertCommissionToPending(commissionId);
  } catch (err) {
    console.error(`[stripe webhook] failed to revert commission ${commissionId}:`, err);
  }
}
