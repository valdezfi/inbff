import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "./LogoutButton";

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
    <div className="flex-1 flex flex-col">
      <header className="border-b border-black/10">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="font-semibold">
              Referly
            </Link>
            <Link
              href="/dashboard/programs"
              className="text-foreground/60 hover:text-foreground"
            >
              Programs
            </Link>
            <Link
              href="/dashboard/payouts"
              className="text-foreground/60 hover:text-foreground"
            >
              Payouts
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-foreground/60">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">{children}</main>
    </div>
  );
}
