import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const status = req.nextUrl.searchParams.get("status") as "pending" | "approved" | "rejected" | undefined;
  const applications = await db.findApplicationsByProgramId(id, status ?? undefined);

  // Enrich with user info
  const enriched = await Promise.all(
    applications.map(async (app) => {
      const user = await db.findUserById(app.userId);
      return { ...app, userName: user?.name ?? "—", userEmail: user?.email ?? "—" };
    })
  );

  return NextResponse.json(enriched);
}
