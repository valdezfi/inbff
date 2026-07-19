import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import JoinForm from "./JoinForm";

export default async function JoinProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;

  const program = await db.findProgramById(programId);
  if (!program) notFound();

  const stores = await db.findStoresByUserId(program.userId);
  const store = stores.find((s) => s.id === program.storeId);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-sm text-foreground/50">{store?.shopDomain}</p>
        <h1 className="text-2xl font-semibold mb-1">{program.name}</h1>
        <p className="text-foreground/60 mb-8 text-sm">
          Join to get your own referral link. You&apos;ll earn {program.commissionRate}% on
          every order you refer.
        </p>
        <JoinForm programId={programId} />
      </div>
    </main>
  );
}
