import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Stripe from "stripe";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion,
  });

  const user = await db.findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let accountId = user.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await db.updateUserStripeAccount(session.userId, accountId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/affiliate/payouts?refresh=1`,
    return_url:  `${appUrl}/affiliate/payouts?connected=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
