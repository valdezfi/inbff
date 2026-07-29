import { NextRequest, NextResponse } from "next/server";
import { nanoid, customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);

/** Collision-safe unique referral code — retries on duplicate. */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = codeAlphabet();
    const exists = await db.findAffiliateByCode(code);
    if (!exists) return code;
  }
  return nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 10);
}

/** Minimal HTML escaping to prevent XSS in email templates. */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const schema = z.object({
  programId: z.string().min(1),
  pitch:     z.string().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { programId, pitch } = parsed.data;

  const program = await db.findProgramById(programId);
  if (!program || program.status !== "active")
    return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const user = await db.findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Brands cannot join programs as affiliates
  if (user.role === "brand") {
    return NextResponse.json(
      { error: "Brand accounts cannot join affiliate programs. Use a creator account." },
      { status: 403 }
    );
  }

  // Check if already a member
  const existingAffiliate = await db.findAffiliateByProgramAndEmail(programId, user.email);
  if (existingAffiliate) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({
      status: "already_member",
      referralCode: existingAffiliate.referralCode,
      referralUrl: `${appUrl}/r/${existingAffiliate.referralCode}`,
    });
  }

  // Open program → instant join with collision-safe code
  if (program.programType === "open") {
    const affiliate = await db.createAffiliate({
      id:           nanoid(),
      programId,
      userId:       session.userId,
      name:         user.name,
      email:        user.email,
      referralCode: await generateUniqueCode(),
      status:       "active",
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const referralUrl = `${appUrl}/r/${affiliate.referralCode}`;
    return NextResponse.json({ status: "joined", referralCode: affiliate.referralCode, referralUrl });
  }

  // Approval-based → create application
  const existing = await db.findApplicationByProgramAndUser(programId, session.userId);
  if (existing) {
    return NextResponse.json({ status: existing.status, applicationId: existing.id });
  }

  const application = await db.createApplication({
    id: nanoid(),
    programId,
    userId: session.userId,
    status: "pending",
    pitch: pitch ?? null,
  });

  // Notify program owner (XSS-safe — all user content is HTML-escaped)
  const owner = await db.findUserById(program.userId);
  if (owner) {
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/programs/${programId}`;
    await sendEmail({
      to:      owner.email,
      subject: `New application to ${program.name}`,
      html: `
        <p>Hi ${esc(owner.name)},</p>
        <p><strong>${esc(user.name)}</strong> (${esc(user.email)}) has applied to join
        <strong>${esc(program.name)}</strong>.</p>
        ${pitch ? `<p>Their pitch: &ldquo;${esc(pitch)}&rdquo;</p>` : ""}
        <p><a href="${reviewUrl}">Review application →</a></p>
      `,
      text: `${user.name} applied to ${program.name}.\n${pitch ? `Pitch: ${pitch}\n` : ""}Review: ${reviewUrl}`,
    }).catch(err => console.error("[applications] notify email failed:", err));
  }

  return NextResponse.json({ status: "pending", applicationId: application.id }, { status: 201 });
}
