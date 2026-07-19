import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await db.findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.createUser({ id: nanoid(), email, passwordHash, name });
  await createSession(user.id);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
