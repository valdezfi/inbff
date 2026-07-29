import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import NewProgramForm from "./NewProgramForm";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const session = await getSession();
  const stores  = await db.findStoresByUserId(session!.userId);
  if (stores.length === 0) redirect("/dashboard/connect-shopify");

  const { storeId } = await searchParams;

  return (
    <div className="max-w-xl stagger">
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All programs
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
          <Plus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create affiliate program</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set up your program in 4 steps — affiliates get unique links instantly.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <NewProgramForm
          stores={stores.map(s => ({ id: s.id, shopDomain: s.shopDomain }))}
          initialStoreId={storeId}
        />
      </div>
    </div>
  );
}
