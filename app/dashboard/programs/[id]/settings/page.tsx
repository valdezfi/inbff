import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ProgramSettingsForm from "./ProgramSettingsForm";
import { ArrowLeft, Settings } from "lucide-react";

type Ctx = { params: Promise<{ id: string }> };

export default async function ProgramSettingsPage({ params }: Ctx) {
  const { id }  = await params;
  const session = await getSession();

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session!.userId) notFound();

  const selectedProductIds = await db.findProgramProductIds(id);

  return (
    <div className="max-w-xl stagger">
      <Link
        href={`/dashboard/programs/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to program
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-md">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Program settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">{program.name}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <ProgramSettingsForm
          program={program}
          initialSelectedIds={selectedProductIds}
        />
      </div>
    </div>
  );
}
