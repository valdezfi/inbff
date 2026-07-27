import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = z.object({ token: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Token is required." }, { status: 400 });

  const user = await db.findUserByVerificationToken(parsed.data.token);
  if (!user) {
    return NextResponse.json({ error: "This verification link is invalid or already used." }, { status: 400 });
  }
  if (user.emailVerified) {
    await createSession(user.id, user.role);
    return NextResponse.json({ ok: true });
  }
  if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
    return NextResponse.json({ error: "This verification link has expired.", code: "TOKEN_EXPIRED" }, { status: 400 });
  }

  await db.verifyUserEmail(user.id);
  await createSession(user.id, user.role);

  // Redirect depends on role
  const redirectTo = user.role === "affiliate" ? "/marketplace" : "/dashboard/connect-shopify";
  return NextResponse.json({ ok: true, redirectTo });
}
