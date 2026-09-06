import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { buildStorefrontDestination, normalizeReferralCode } from "@/lib/referrals";

// Attribution window in days — matches the program's attributionWindowDays setting.
// We store it in a cookie so even if Shopify strips ?ref= from the URL during
// checkout, the order webhook can still attribute the sale.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days fallback; overridden per program below

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

  // Destination: storefront with ?ref= param embedded so Shopify themes
  // can pass it through to the order (some themes do this natively).
  const destination = process.env.NODE_ENV === "production"
    ? buildStorefrontDestination(store.shopDomain, code)
    : new URL(`/store/${encodeURIComponent(store.shopDomain)}?ref=${encodeURIComponent(code)}`, req.url).toString();

  const res = NextResponse.redirect(destination);

  // Set a fallback attribution cookie. If Shopify strips the ?ref= query
  // param during checkout, the order webhook handler can read this cookie
  // (via x-forwarded-for / session matching is not possible server-side,
  // but client-side scripts can forward it). This also enables attribution
  // for multi-step checkouts that lose the original URL params.
  const cookieMaxAge = (program.attributionWindowDays ?? 30) * 24 * 60 * 60;
  res.cookies.set(`ref_${store.shopDomain.replace(/\./g, "_")}`, code, {
    httpOnly: false, // must be readable by client-side Shopify theme scripts
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   cookieMaxAge,
    path:     "/",
  });

  return res;
}
