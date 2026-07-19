/**
 * GET /r/:code
 *
 * The link every affiliate shares: yourapp.com/r/AB12CD3
 *
 * What happens:
 *   1. Track the click in the database.
 *   2. Resolve which Shopify store the program belongs to.
 *   3. Redirect to the REAL Shopify storefront with ?ref=CODE appended.
 *      A small Shopify script tag (installed via the Shopify Script Tag API
 *      during OAuth) captures that param at checkout and writes it into the
 *      order's note_attributes so our webhook can attribute the sale.
 *
 * We also set a first-party cookie (ref_code) as a fallback for stores that
 * don't yet have the script tag installed or when the user navigates away
 * from the landing page before checking out.
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const affiliate = await db.findAffiliateByCode(code);
  if (!affiliate) {
    return NextResponse.redirect(new URL("/?error=invalid-referral-link", req.url));
  }

  // Track the click (fire-and-forget; don't block the redirect)
  db.createClick({
    id: nanoid(),
    referralCode: code,
    affiliateId: affiliate.id,
    programId: affiliate.programId,
  }).catch((err) => console.error("Failed to record click:", err));

  // Resolve destination
  const program = await db.findProgramById(affiliate.programId);
  const stores = program ? await db.findStoresByUserId(program.userId) : [];
  const store = stores.find((s) => s.id === program?.storeId);

  let destination: string;

  if (store) {
    // Redirect to the real Shopify storefront with the referral code as a
    // query param. The script tag on the store reads ?ref= and stashes it
    // in note_attributes at checkout.
    destination = `https://${store.shopDomain}?ref=${encodeURIComponent(code)}`;
  } else {
    destination = `/?error=store-not-found`;
  }

  const res = NextResponse.redirect(destination);

  // First-party cookie fallback: 30-day lifetime, readable by JS on our domain
  // so the join form can pre-fill the ref code if someone lands on our site
  // before going to the store.
  res.cookies.set("ref_code", code, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
