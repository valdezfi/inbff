import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import JoinForm from "./JoinForm";
import { Percent, Store } from "lucide-react";

function LogoMark() {
  return (
    <svg viewBox="0 0 42 34" aria-hidden="true" style={{ width: 26, fill: "#006cd2" }}>
      <polygon points="12,0 30,0 33.2,3.2 15.2,3.2" />
      <polygon points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
      <polygon points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
      <polygon points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
      <polygon points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
      <polygon points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
    </svg>
  );
}

export default async function JoinProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const program = await db.findProgramById(programId);
  if (!program) notFound();

  const stores = await db.findStoresByUserId(program.userId);
  const store  = stores.find(s => s.id === program.storeId);
  const affiliateCount = await db.findAffiliatesByProgramId(programId).then(a => a.length);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-20"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-lg text-[#0a0a0a]">
            <LogoMark />
            inBFF
          </Link>
        </div>

        <div className="border border-[#e4e8ed] bg-white p-8">
          {/* Store badge */}
          {store && (
            <div className="inline-flex items-center gap-1.5 border border-[#e4e8ed] px-3 py-1 text-xs text-[#6b7378] mb-5">
              <Store className="h-3 w-3" />
              {store.shopDomain}
            </div>
          )}

          <h1 className="text-2xl font-bold text-[#0a0a0a] mb-2">{program.name}</h1>

          {/* Commission badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#e8f2fb] border border-[#006cd2]/20 px-3 py-1.5 text-sm font-semibold text-[#006cd2] mb-2">
            <Percent className="h-3.5 w-3.5" />
            Earn {program.commissionRate}% commission
          </div>

          <p className="text-sm text-[#6b7378] mb-2">on every order you refer to this store.</p>

          {affiliateCount > 0 && (
            <p className="text-xs text-[#6b7378] mb-6">
              {affiliateCount} affiliate{affiliateCount > 1 ? "s" : ""} already earning
            </p>
          )}

          <div className="border-t border-[#e4e8ed] pt-6">
            {program.status !== "active" ? (
              <p className="text-sm text-[#6b7378]">This program isn&apos;t accepting new affiliates right now.</p>
            ) : program.programType === "open" ? (
              <>
                <p className="text-sm font-semibold text-[#0a0a0a] mb-4">Join to get your referral link</p>
                <JoinForm programId={programId} />
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#6b7378]">This program reviews applications before approving affiliates.</p>
                <Link href={`/marketplace/${programId}`}
                  className="inline-flex items-center justify-center w-full bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
                  Sign in to apply
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#6b7378] mt-5">
          Powered by inBFF · Free for affiliates
        </p>
      </div>
    </main>
  );
}
