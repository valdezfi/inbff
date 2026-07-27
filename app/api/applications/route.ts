import { NextRequest, NextResponse } from "next/server";
import { nanoid, customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);

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

  // Open program → instant join
  if (program.programType === "open") {
    const affiliate = await db.createAffiliate({
      id: nanoid(),
      programId,
      userId: session.userId,
      name: user.name,
      email: user.email,
      referralCode: codeAlphabet(),
      status: "active",
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

  // Notify program owner
  const owner = await db.findUserById(program.userId);
  if (owner) {
    await sendEmail({
      to: owner.email,
      subject: `New application to ${program.name}`,
      html: `<p>Hi ${owner.name},</p><p><strong>${user.name}</strong> (${user.email}) has applied to join <strong>${program.name}</strong>.</p>${pitch ? `<p>Pitch: "${pitch}"</p>` : ""}<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/programs/${programId}">Review application →</a></p>`,
      text: `${user.name} applied to ${program.name}.\n${pitch ? `Pitch: ${pitch}\n` : ""}Review: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/programs/${programId}`,
    }).catch(console.error);
  }

  return NextResponse.json({ status: "pending", applicationId: application.id }, { status: 201 });
}
