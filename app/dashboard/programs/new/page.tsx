import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import NewProgramForm from "./NewProgramForm";

export default async function NewProgramPage() {
  const session = await getSession();
  const stores = await db.findStoresByUserId(session!.userId);
  if (stores.length === 0) redirect("/dashboard/connect-shopify");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">New affiliate program</h1>
      <p className="text-sm text-gray-500 mb-8">
        Set a name and commission rate. We&apos;ll generate a shareable invite link instantly.
      </p>
      <NewProgramForm stores={stores.map((s) => ({ id: s.id, shopDomain: s.shopDomain }))} />
    </div>
  );
}
