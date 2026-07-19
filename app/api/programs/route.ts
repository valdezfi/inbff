import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  storeId: z.string().min(1, "Store is required."),
  name: z.string().min(1, "Program name is required.").max(200),
  commissionRate: z
    .number()
    .min(0, "Commission rate must be at least 0%.")
    .max(100, "Commission rate cannot exceed 100%."),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Verify the store belongs to the authenticated user
  const stores = await db.findStoresByUserId(session.userId);
  const store = stores.find((s) => s.id === parsed.data.storeId);
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const program = await db.createProgram({
    id: nanoid(),
    userId: session.userId,
    storeId: store.id,
    name: parsed.data.name,
    commissionRate: parsed.data.commissionRate,
  });

  return NextResponse.json(program);
}
