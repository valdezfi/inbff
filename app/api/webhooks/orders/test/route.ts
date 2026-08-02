/**
 * POST /api/webhooks/orders/test
 *
 * Development-only endpoint that mimics the Shopify orders/create webhook
 * without requiring HMAC verification.  Blocked in production.
 *
 * Used by the local test storefront at /store/[shopDomain].
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { z } from "zod";
import { isAttributionEligible, normalizeReferralCode } from "@/lib/referrals";

const schema = z.object({
  shopDomain: z.string().min(1),
  shopifyOrderId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  referralCode: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { shopDomain, shopifyOrderId, amount, currency, referralCode } = parsed.data;

  const store = await db.findStoreByDomain(shopDomain);
  if (!store) return NextResponse.json({ error: "Unknown store." }, { status: 404 });

  const code = referralCode ? normalizeReferralCode(referralCode) : null;
  const affiliate = code ? await db.findAffiliateByCode(code) : null;
  const program = affiliate ? await db.findProgramById(affiliate.programId) : null;
  const lastClick = code ? await db.findLatestClickByCode(code) : null;
  const eligible = !!affiliate && !!program && isAttributionEligible({
    affiliateActive: affiliate.status === "active", programActive: program.status === "active",
    programStoreId: program.storeId, webhookStoreId: store.id,
    latestClickAt: lastClick?.createdAt ?? null, attributionWindowDays: program.attributionWindowDays,
    now: Date.now(),
  });

  const order = await db.createOrder({
    id: nanoid(),
    programId: eligible && program ? program.id : null,
    storeId: store.id,
    shopifyOrderId,
    referralCode: eligible ? code : null,
    affiliateId: eligible && affiliate ? affiliate.id : null,
    amount,
    currency,
  });

  let commission = null;
  if (eligible && affiliate && program && !await db.findCommissionByOrderId(order.id)) {
      const commissionAmount =
        Math.round(amount * (program.commissionRate / 100) * 100) / 100;
      commission = await db.createCommission({
        id: nanoid(),
        orderId: order.id,
        affiliateId: affiliate.id,
        programId: program.id,
        amount: commissionAmount,
        rate: program.commissionRate,
        status: "pending",
      });
  }

  return NextResponse.json({ order, commission });
}
