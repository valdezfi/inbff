import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/affiliate/programs
 *
 * Returns all programs the logged-in creator has joined, with per-program stats.
 * Fixed: parallel batch fetching (was N*4 sequential DB calls).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const affiliates = await db.findAffiliatesByUserId(session.userId);
  if (affiliates.length === 0) return NextResponse.json([]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Batch: fetch all programs + clicks + commissions in parallel
  const [programs, clickCounts, commissionSets] = await Promise.all([
    Promise.all(affiliates.map(a => db.findProgramById(a.programId))),
    Promise.all(affiliates.map(a => db.countClicksByAffiliateId(a.id))),
    Promise.all(affiliates.map(a => db.findCommissionsByAffiliateId(a.id))),
  ]);

  // Fetch stores for each unique brand owner — one call per owner (not per affiliate)
  const uniqueOwnerIds = [...new Set(programs.filter(Boolean).map(p => p!.userId))];
  const storesByOwner  = new Map(
    await Promise.all(uniqueOwnerIds.map(async uid => [uid, await db.findStoresByUserId(uid)] as const))
  );

  const enriched = affiliates.map((aff, i) => {
    const program = programs[i];
    const comms   = commissionSets[i];
    const stores  = program ? (storesByOwner.get(program.userId) ?? []) : [];
    const store   = stores.find(s => s.id === program?.storeId);

    return {
      affiliateId:    aff.id,
      referralCode:   aff.referralCode,
      referralUrl:    `${appUrl}/r/${aff.referralCode}`,
      status:         aff.status,
      joinedAt:       aff.joinedAt,
      program: program ? {
        id:              program.id,
        name:            program.name,
        commissionRate:  program.commissionRate,
        payoutThreshold: program.payoutThreshold,
        currency:        program.currency,
        status:          program.status,
        shopDomain:      store?.shopDomain ?? "",
      } : null,
      clicks:  clickCounts[i],
      orders:  comms.length,
      pending: comms.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0),
      paid:    comms.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0),
    };
  });

  return NextResponse.json(enriched);
}
