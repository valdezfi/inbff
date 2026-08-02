import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { buildStorefrontDestination, normalizeReferralCode } from "@/lib/referrals";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  if (!code) return NextResponse.redirect(new URL("/?error=invalid-referral-link", req.url));

  const affiliate = await db.findAffiliateByCode(code);
  if (!affiliate) return NextResponse.redirect(new URL("/?error=invalid-referral-link", req.url));

  const program = await db.findProgramById(affiliate.programId);
  if (!program || program.status !== "active") {
    return NextResponse.redirect(new URL("/?error=inactive-referral-link", req.url));
  }
  const stores  = program ? await db.findStoresByUserId(program.userId) : [];
  const store   = stores.find(s => s.id === program?.storeId);
  if (!store) return NextResponse.redirect(new URL("/?error=store-not-found", req.url));

  await db.createClick({
    id: nanoid(),
    referralCode:  code,
    affiliateId:   affiliate.id,
    programId:     affiliate.programId,
    ipAddress:     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent:     req.headers.get("user-agent") ?? null,
  });

  // Destination: specific product if program has one, otherwise store homepage
  const destination = process.env.NODE_ENV === "production"
    ? buildStorefrontDestination(store.shopDomain, code)
    : new URL(`/store/${encodeURIComponent(store.shopDomain)}?ref=${encodeURIComponent(code)}`, req.url).toString();

  const res = NextResponse.redirect(destination);

  return res;
}
