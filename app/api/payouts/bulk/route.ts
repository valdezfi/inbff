import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = stripeKey ? (require("stripe") as typeof import("stripe")) : null;
  const stripe = Stripe && stripeKey ? new Stripe.default(stripeKey, { apiVersion: "2026-06-24.dahlia" }) : null;

  // Fetch affiliates once (outside the loop) to avoid N+1 queries
  const affiliates = await db.findAffiliatesByProgramId(program.id);

  let paid = 0;
  for (const commission of pending) {
    let transferId: string | null = null;
    if (stripe) {
      const aff = affiliates.find(a => a.id === commission.affiliateId);
      if (aff?.userId) {
        const user = await db.findUserById(aff.userId);
        if (user?.stripeAccountId) {
          try {
            const t = await stripe.transfers.create({
              amount:      Math.round(commission.amount * 100),
              currency:    program.currency.toLowerCase(),
              destination: user.stripeAccountId,
              description: `inBFF bulk payout — ${program.name}`,
              metadata: {
                commissionId: commission.id,
                programId:    program.id,
                affiliateId:  commission.affiliateId,
              },
            });
            transferId = t.id;
          } catch (e) {
            console.error("Stripe transfer error:", e);
            continue;
          }
        }
      }
    }
    await db.markCommissionPaid(commission.id, transferId);
    paid++;
  }

  return NextResponse.json({ paid });
}
