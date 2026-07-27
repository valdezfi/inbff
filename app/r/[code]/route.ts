import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const affiliate = await db.findAffiliateByCode(code);
  if (!affiliate) return NextResponse.redirect(new URL("/?error=invalid-referral-link", req.url));

  const program = await db.findProgramById(affiliate.programId);
  const stores  = program ? await db.findStoresByUserId(program.userId) : [];
  const store   = stores.find(s => s.id === program?.storeId);

  // Record click with IP + UA (fire-and-forget)
  db.createClick({
    id: nanoid(),
    referralCode:  code,
    affiliateId:   affiliate.id,
    programId:     affiliate.programId,
    ipAddress:     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent:     req.headers.get("user-agent") ?? null,
  }).catch(err => console.error("Failed to record click:", err));

  // Destination: specific product if program has one, otherwise store homepage
  let destination: string;
  if (store) {
    destination = `https://${store.shopDomain}?ref=${encodeURIComponent(code)}`;
  } else {
    destination = `/?error=store-not-found`;
  }

  const res = NextResponse.redirect(destination);

  // Cookie lifetime = attribution window (or 30d default)
  const windowDays = program?.attributionWindowDays ?? 30;
  res.cookies.set("ref_code", code, {
    httpOnly: false,
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60 * 24 * windowDays,
  });

  return res;
}
