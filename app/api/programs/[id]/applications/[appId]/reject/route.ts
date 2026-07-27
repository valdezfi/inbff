import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string; appId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id: programId, appId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const program = await db.findProgramById(programId);
  if (!program || program.userId !== session.userId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const apps = await db.findApplicationsByProgramId(programId);
  const app = apps.find(a => a.id === appId);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Application is not pending." }, { status: 409 });

  await db.updateApplicationStatus(appId, "rejected");

  const user = await db.findUserById(app.userId);
  if (user) {
    await sendEmail({
      to: user.email,
      subject: `Update on your ${program.name} application`,
      html: `<p>Hi ${user.name},</p><p>Unfortunately your application to <strong>${program.name}</strong> was not approved at this time.</p>`,
      text: `Hi ${user.name},\n\nYour application to ${program.name} was not approved.`,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
