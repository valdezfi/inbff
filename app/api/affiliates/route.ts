import { NextRequest, NextResponse } from "next/server";
import { nanoid, customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { z } from "zod";

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);

const schema = z.object({
  programId: z.string().min(1, "Program ID is required."),
  name: z.string().min(1, "Name is required.").max(100),
  email: z.string().email("Enter a valid email address."),
});

/**
 * POST /api/affiliates
 *
 * Public — anyone with a program invite link can call this to join as an
 * affiliate.  Returns the affiliate record and their unique referral path.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { programId, name, email } = parsed.data;

  const program = await db.findProgramById(programId);
  if (!program) {
    return NextResponse.json({ error: "Affiliate program not found." }, { status: 404 });
  }

  // Idempotent — re-joining with the same email returns the existing record
  const existing = await db.findAffiliateByProgramAndEmail(programId, email);
  if (existing) {
    const store = await db.findStoresByUserId(program.userId).then((stores) =>
      stores.find((s) => s.id === program.storeId)
    );
    return NextResponse.json({
      affiliate: existing,
      referralPath: `/r/${existing.referralCode}`,
      storeDomain: store?.shopDomain ?? null,
    });
  }

  const affiliate = await db.createAffiliate({
    id: nanoid(),
    programId: program.id,
    name,
    email,
    referralCode: codeAlphabet(),
  });

  const stores = await db.findStoresByUserId(program.userId);
  const store = stores.find((s) => s.id === program.storeId);

  return NextResponse.json({
    affiliate,
    referralPath: `/r/${affiliate.referralCode}`,
    storeDomain: store?.shopDomain ?? null,
  });
}
