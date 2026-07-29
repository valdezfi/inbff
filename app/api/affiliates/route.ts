import { NextRequest, NextResponse } from "next/server";
import { nanoid, customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);

/** Generate a unique referral code — retries up to 5 times on collision. */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = codeAlphabet();
    // Check uniqueness before inserting (JSON DB has no unique index enforcement at DB level)
    const existing = await db.findAffiliateByCode(code);
    if (!existing) return code;
  }
  // Extremely unlikely — fall back to a longer nanoid-based code
  return nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 10);
}

const schema = z.object({
  programId: z.string().min(1, "Program ID is required."),
  name:      z.string().min(1, "Name is required.").max(100),
  email:     z.string().email("Enter a valid email address."),
});

/**
 * POST /api/affiliates
 *
 * Public (legacy join page) — anyone with a program invite link can call this
 * to join as an affiliate without an account.
 *
 * The newer authenticated flow uses /api/applications instead.
 * If the user is logged in, their userId is linked to the affiliate record.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { programId, name, email } = parsed.data;

  // Check if user is authenticated — link affiliate to their account
  const session = await getSession();

  // Block brand accounts from joining programs
  if (session) {
    const user = await db.findUserById(session.userId);
    if (user?.role === "brand") {
      return NextResponse.json(
        { error: "Brand accounts cannot join affiliate programs." },
        { status: 403 }
      );
    }
  }

  const program = await db.findProgramById(programId);
  if (!program || program.status !== "active") {
    return NextResponse.json({ error: "Affiliate program not found or not active." }, { status: 404 });
  }

  // Idempotent — re-joining with same email returns the existing record
  const existing = await db.findAffiliateByProgramAndEmail(programId, email);
  if (existing) {
    const store = await db.findStoresByUserId(program.userId)
      .then(stores => stores.find(s => s.id === program.storeId));
    return NextResponse.json({
      affiliate:    existing,
      referralPath: `/r/${existing.referralCode}`,
      storeDomain:  store?.shopDomain ?? null,
    });
  }

  // Generate a collision-safe unique referral code
  const referralCode = await generateUniqueCode();

  const affiliate = await db.createAffiliate({
    id:           nanoid(),
    programId:    program.id,
    userId:       session?.userId ?? null,
    name,
    email,
    referralCode,
    status:       "active",
  });

  const store = await db.findStoresByUserId(program.userId)
    .then(stores => stores.find(s => s.id === program.storeId));

  return NextResponse.json({
    affiliate,
    referralPath: `/r/${affiliate.referralCode}`,
    storeDomain:  store?.shopDomain ?? null,
  });
}
