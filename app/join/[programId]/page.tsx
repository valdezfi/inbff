import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import JoinForm from "./JoinForm";
import { Percent, Store } from "lucide-react";

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
  const affiliateCount = await db.findAffiliatesByProgramId(programId).then((a) => a.length);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20 bg-[#0A0A0B]">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
              <span className="font-black text-white text-xs" />
            </span>
            <span className="font-bold text-white tracking-tight">inBFF</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 shadow-2xl">
          {/* Store badge */}
          {store && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 mb-5">
              <Store className="h-3 w-3" />
              {store.shopDomain}
            </div>
          )}

          <h1 className="text-2xl font-semibold text-white mb-2">{program.name}</h1>

          {/* Commission highlight */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-sm font-semibold text-blue-300">
              <Percent className="h-3.5 w-3.5" />
              Earn {program.commissionRate}% commission
            </span>
          </div>

          <p className="text-sm text-white/50 mb-2">
            on every order you refer to this store.
          </p>

          {affiliateCount > 0 && (
            <p className="text-xs text-white/30 mb-6">
              {affiliateCount} affiliate{affiliateCount > 1 ? "s" : ""} already earning
            </p>
          )}

          <div className="border-t border-white/10 pt-6">
            {program.status !== "active" ? (
              <p className="text-sm text-white/50">
                This program isn&apos;t accepting new affiliates right now.
              </p>
            ) : program.programType === "open" ? (
              <>
                <p className="text-sm font-medium text-white mb-4">Join to get your referral link</p>
                <JoinForm programId={programId} />
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/50">
                  This program reviews applications before approving affiliates.
                </p>
                <Link
                  href={`/marketplace/${programId}`}
                  className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
                >
                  Sign in to apply
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/25 mt-5">
          Powered by inBFF · Free for affiliates
        </p>
      </div>
    </main>
  );
}
