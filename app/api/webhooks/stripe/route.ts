/**
 * POST /api/webhooks/stripe
 *
 * Handles inbound Stripe Connect webhook events.
 *
 * Events handled:
 *   transfer.reversed / transfer.failed — revert commission to pending for retry
 *   payout.failed                       — log failure on connected account
 *   account.updated                     — log when affiliate payout capability changes
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  — from `stripe listen --forward-to ...` or Stripe dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripeKey     = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion })
  : null;

// Next.js App Router streams the raw body — no body-parser config needed.
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
    // No webhook secret — accept unsigned events in dev only.
    console.warn(
      "[stripe webhook] STRIPE_WEBHOOK_SECRET not set — " +
      "skipping signature verification. Set it before going to production."
    );
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  try {
    // Cast to string: Stripe v22 removed transfer.failed from its event-type
    // union (transfers now emit transfer.created / transfer.reversed only).
    // A string switch keeps the handler forward-compatible with any future
    // Stripe event types without requiring an SDK upgrade.
    const eventType = event.type as string;

    switch (eventType) {
      // ── Transfer reversed or failed ─────────────────────────────────────
      // Revert the commission to pending so the brand can retry the payout.
      case "transfer.reversed":
      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        const commissionId = transfer.metadata?.commissionId;
        if (commissionId) {
          await revertCommissionToPending(commissionId);
          console.log(`[stripe webhook] ${eventType} — reverted commission ${commissionId} to pending`);
        }
        break;
      }

      // ── Payout failed on a connected account ────────────────────────────
      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.warn(
          `[stripe webhook] payout.failed — id=${payout.id} ` +
          `failure_message=${payout.failure_message ?? "unknown"}`
        );
        break;
      }

      // ── Account updated ─────────────────────────────────────────────────
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

// ── Revert a commission from paid → pending ───────────────────────────────────
// Called when a Stripe transfer fails after we already marked the commission
// paid — prevents the brand seeing "paid" when no money moved.
async function revertCommissionToPending(commissionId: string): Promise<void> {
  try {
    await db.revertCommissionToPending(commissionId);
  } catch (err) {
    console.error(`[stripe webhook] failed to revert commission ${commissionId}:`, err);
  }
}
