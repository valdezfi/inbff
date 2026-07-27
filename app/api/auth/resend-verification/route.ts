/**
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * Issues a fresh token and resends the verification email.
 * Always returns 200 to avoid leaking which emails are registered.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, verificationEmailHtml, verificationEmailText } from "@/lib/email";
import { z } from "zod";
import { randomBytes } from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const user = await db.findUserByEmail(parsed.data.email);

  // Silently skip if not found or already verified — don't leak info
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const verificationToken = randomBytes(32).toString("hex");
  const verificationTokenExpiry = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();

  await db.updateVerificationToken(user.id, verificationToken, verificationTokenExpiry);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your inBFF account",
    html: verificationEmailHtml(user.name, verifyUrl),
    text: verificationEmailText(user.name, verifyUrl),
  });

  return NextResponse.json({ ok: true });
}
