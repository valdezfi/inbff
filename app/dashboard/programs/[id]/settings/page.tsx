import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ProgramSettingsForm from "./ProgramSettingsForm";
import { ArrowLeft } from "lucide-react";

type Ctx = { params: Promise<{ id: string }> };

export default async function ProgramSettingsPage({ params }: Ctx) {
  const { id } = await params;
  const session = await getSession();
  const program = await db.findProgramById(id);
  if (!program || program.userId !== session!.userId) notFound();

  return (
    <div className="max-w-lg stagger">
      <Link href={`/dashboard/programs/${id}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to program
      </Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Program settings</h1>
        <p className="text-sm text-gray-500 mb-6">Edit your program details, commission, and payout settings.</p>
        <ProgramSettingsForm program={program} />
      </div>
    </div>
  );
}
