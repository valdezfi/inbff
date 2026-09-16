import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { buildReferralUrl, generateUniqueReferralCode } from "@/lib/referrals";

type Ctx = { params: Promise<{ id: string; appId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id: programId, appId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(programId);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const app = await db.findApplicationsByProgramId(programId).then(apps => apps.find(a => a.id === appId));
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Application is not pending." }, { status: 409 });

  // Approve
  await db.updateApplicationStatus(appId, "approved");

  const user = await db.findUserById(app.userId);
  const referralCode = await generateUniqueReferralCode(db.findAffiliateByCodeAnyStatus);
  const discountCode = "REF-" + nanoid(6).toUpperCase();

  const store = await db.findStoreById(program.storeId);
  if (store) {
    const { createAffiliateDiscountCode } = await import("@/lib/shopify");
    await createAffiliateDiscountCode(store, discountCode);
  }

  const affiliate = await db.createAffiliate({
    id: nanoid(),
    programId,
    userId: app.userId,
    name: user?.name ?? "Affiliate",
    email: user?.email ?? "",
    referralCode,
    discountCode,
    status: "active",
  });

  // Send approval email
  if (user) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const referralUrl = buildReferralUrl(appUrl, affiliate.referralCode);
    await sendEmail({
      to: user.email,
      subject: `You're approved for ${program.name}!`,
      html: `<p>Hi ${user.name},</p><p>Your application to <strong>${program.name}</strong> has been approved.</p><p>Your referral link: <a href="${referralUrl}">${referralUrl}</a></p><p>Your unique discount code for customers: <strong>${discountCode}</strong></p><p>Share it anywhere to start earning ${program.commissionRate}% on every sale.</p>`,
      text: `Hi ${user.name},\n\nYou're approved for ${program.name}!\n\nYour referral link: ${referralUrl}\nYour discount code: ${discountCode}\n\nEarn ${program.commissionRate}% on every sale.`,
    }).catch(console.error);
  }

  return NextResponse.json({ application: { ...app, status: "approved" }, affiliate });
}
