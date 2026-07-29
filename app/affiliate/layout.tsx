import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AffiliateShell from "./AffiliateShell";

// Route protection is handled by middleware.ts
export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.findUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <AffiliateShell userName={user.name} userEmail={user.email} role={user.role}>
      {children}
    </AffiliateShell>
  );
}
