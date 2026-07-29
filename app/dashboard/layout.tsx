import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardShell from "./DashboardShell";

// Route protection is handled by middleware.ts
// This layout just loads the user for the shell.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.findUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <DashboardShell userName={user.name} userEmail={user.email}>
      {children}
    </DashboardShell>
  );
}
