import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!program.name?.trim()) return NextResponse.json({ error: "Program must have a name before publishing." }, { status: 400 });

  const updated = await db.updateProgram(id, { status: "active" });
  return NextResponse.json(updated);
}
