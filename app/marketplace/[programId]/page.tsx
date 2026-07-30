import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import JoinProgramButton from "./JoinProgramButton";
import { ArrowLeft, Users, Clock, TrendingUp, Store, Tag } from "lucide-react";

type Ctx = { params: Promise<{ programId: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { programId } = await params;
  const program = await db.findProgramById(programId);
  if (!program) return { title: "Program not found — inBFF" };
  return {
    title: `${program.name} — inBFF Marketplace`,
    description: program.description ?? `Earn ${program.commissionRate}% commission promoting ${program.name}.`,
  };
}

export default async function ProgramDetailPage({ params }: Ctx) {
  const { programId } = await params;
  const program = await db.findProgramById(programId);
  if (!program || program.status !== "active") notFound();

  const [stores, affiliates] = await Promise.all([
    db.findStoresByUserId(program.userId),
    db.findAffiliatesByProgramId(programId),
  ]);
  const store        = stores.find(s => s.id === program.storeId);
  const activeCount  = affiliates.filter(a => a.status === "active").length;

  // Check if current user is already an affiliate
  const session = await getSession();
  let existingCode: string | null = null;
  let existingStatus: string | null = null;
  if (session) {
    const userAffiliates = await db.findAffiliatesByUserId(session.userId);
    const match = userAffiliates.find(a => a.programId === programId);
    if (match) existingCode = match.referralCode;
    if (!match) {
      const app = await db.findApplicationByProgramAndUser(programId, session.userId);
      if (app) existingStatus = app.status;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="bg-[#0A0A0B] min-h-screen text-white">
      <Nav />
      <div className="mx-auto max-w-4xl px-6 pt-28 pb-24">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-[1fr_320px] items-start">
          {/* Main */}
          <div>
            {program.bannerUrl && (
              <img src={program.bannerUrl} alt="" className="w-full h-48 object-cover rounded-2xl mb-6" />
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
                <Store className="h-3 w-3" />{store?.shopDomain ?? ""}
              </span>
              <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-white/40 flex items-center gap-1">
                <Tag className="h-3 w-3" />{program.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">{program.name}</h1>
            {program.description && (
              <p className="text-white/60 text-base leading-relaxed mb-6">{program.description}</p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: TrendingUp, label: "Commission", value: `${program.commissionRate}%`, color: "text-emerald-400" },
                { icon: Clock,      label: "Cookie window", value: `${program.attributionWindowDays} days`, color: "text-blue-400" },
                { icon: Users,      label: "Affiliates", value: activeCount, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* How earnings work */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-semibold text-white mb-3">How it works</h2>
              <ol className="space-y-2 text-sm text-white/60">
                <li className="flex gap-2"><span className="text-[#3B82F6] font-mono">01</span> Join to get your unique referral link</li>
                <li className="flex gap-2"><span className="text-[#3B82F6] font-mono">02</span> Share it on any platform — Instagram, YouTube, blog, newsletter</li>
                <li className="flex gap-2"><span className="text-[#3B82F6] font-mono">03</span> When someone buys within {program.attributionWindowDays} days of clicking, you earn {program.commissionRate}%</li>
                <li className="flex gap-2"><span className="text-[#3B82F6] font-mono">04</span> Earnings hit your account via Stripe Connect — no invoicing needed</li>
              </ol>
            </div>
          </div>

          {/* Join card */}
          <div className="sticky top-24">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-emerald-400">{program.commissionRate}%</p>
                <p className="text-sm text-white/50 mt-0.5">commission per sale</p>
              </div>

              <div className="space-y-2 mb-6 text-sm text-white/60">
                <div className="flex justify-between"><span>Program type</span><span className={`font-medium ${program.programType === "open" ? "text-emerald-400" : "text-amber-400"}`}>{program.programType === "open" ? "Open — instant join" : "Approval required"}</span></div>
                <div className="flex justify-between"><span>Cookie window</span><span className="font-medium text-white">{program.attributionWindowDays} days</span></div>
                <div className="flex justify-between"><span>Payout threshold</span><span className="font-medium text-white">${program.payoutThreshold}</span></div>
                <div className="flex justify-between"><span>Currency</span><span className="font-medium text-white">{program.currency}</span></div>
              </div>

              <JoinProgramButton
                programId={programId}
                programType={program.programType}
                programName={program.name}
                existingCode={existingCode}
                existingStatus={existingStatus}
                appUrl={appUrl}
                isLoggedIn={!!session}
              />

              {!session && (
                <p className="text-center text-xs text-white/30 mt-3">
                  <Link href="/signup?role=creator" className="text-[#3B82F6] hover:text-blue-300">Create a free account</Link> to join
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
