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

  // Only toggle between active ⇄ paused. Without this guard, calling this
  // endpoint on a draft program would activate it — bypassing the
  // "must have a name" check enforced by /publish — and calling it on a
  // deleted program would resurrect it.
  if (program.status !== "active" && program.status !== "paused") {
    return NextResponse.json(
      { error: "Only active or paused programs can be toggled here. Publish a draft program first." },
      { status: 400 }
    );
  }

  const newStatus = program.status === "active" ? "paused" : "active";
  const updated = await db.updateProgram(id, { status: newStatus });
  return NextResponse.json(updated);
}
