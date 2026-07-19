import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import NewProgramForm from "./NewProgramForm";

export default async function NewProgramPage() {
  const session = await getSession();
  const stores = await db.findStoresByUserId(session!.userId);

  if (stores.length === 0) redirect("/dashboard/connect-shopify");

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-1">Create an affiliate program</h1>
      <p className="text-foreground/60 text-sm mb-8">
        Set a commission rate. Affiliates who join this program will earn this percentage on
        every order they refer.
      </p>
      <NewProgramForm
        stores={stores.map((s) => ({ id: s.id, shopDomain: s.shopDomain }))}
      />
    </div>
  );
}
