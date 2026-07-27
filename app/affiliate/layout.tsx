import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AffiliatShell from "./AffiliateShell";

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.findUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <AffiliatShell userName={user.name} userEmail={user.email} role={user.role}>
      {children}
    </AffiliatShell>
  );
}
