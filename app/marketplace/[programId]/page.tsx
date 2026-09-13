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
  const store       = stores.find(s => s.id === program.storeId);
  const activeCount = affiliates.filter(a => a.status === "active").length;

  const session = await getSession();
  const navUser = session ? { id: session.userId, name: "", email: "", role: session.role } : null;

  let existingCode: string | null = null;
  let existingStatus: string | null = null;
  if (session) {
    const userAffiliates = await db.findAffiliatesByUserId(session.userId);
    const match = userAffiliates.find(a => a.programId === programId);
    if (match) {
      existingCode = match.referralCode;
    } else {
      const app = await db.findApplicationByProgramAndUser(programId, session.userId);
      if (app) existingStatus = app.status;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <Nav initialUser={navUser} />

      <div className="mx-auto max-w-4xl px-6 pt-28 pb-24">
        <Link href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs text-[#6b7378] hover:text-[#006cd2] transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-[1fr_300px] items-start">
          {/* Main */}
          <div>
            {program.bannerUrl && (
              <img src={program.bannerUrl} alt="" className="w-full h-48 object-cover mb-6 border border-[#e4e8ed]" />
            )}

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-[#6b7378] flex items-center gap-1 border border-[#e4e8ed] px-2 py-0.5">
                <Store className="h-3 w-3" />{store?.shopDomain ?? ""}
              </span>
              <span className="text-xs text-[#6b7378] flex items-center gap-1 border border-[#e4e8ed] px-2 py-0.5">
                <Tag className="h-3 w-3" />{program.category}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-3">{program.name}</h1>
            {program.description && (
              <p className="text-[#6b7378] text-base leading-relaxed mb-6">{program.description}</p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: TrendingUp, label: "Commission",   value: `${program.commissionRate}%`, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                { icon: Clock,      label: "Cookie window",value: `${program.attributionWindowDays}d`, color: "text-[#006cd2]", bg: "bg-[#f0f7ff] border-[#006cd2]/20" },
                { icon: Users,      label: "Affiliates",   value: activeCount, color: "text-[#1a1a1a]", bg: "bg-[#f5f7fa] border-[#e4e8ed]" },
              ].map(s => (
                <div key={s.label} className={`border ${s.bg} p-4 text-center`}>
                  <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                  <p className="text-lg font-bold text-[#0a0a0a]">{s.value}</p>
                  <p className="text-xs text-[#6b7378] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="border border-[#e4e8ed] bg-[#f5f7fa] p-6">
              <h2 className="font-bold text-[#0a0a0a] mb-4">How it works</h2>
              <ol className="space-y-3 text-sm text-[#6b7378]">
                <li className="flex gap-3">
                  <span className="text-[#006cd2] font-bold font-mono w-6 shrink-0">01</span>
                  Join to get your unique referral link
                </li>
                <li className="flex gap-3">
                  <span className="text-[#006cd2] font-bold font-mono w-6 shrink-0">02</span>
                  Share it on any platform — Instagram, YouTube, blog, newsletter
                </li>
                <li className="flex gap-3">
                  <span className="text-[#006cd2] font-bold font-mono w-6 shrink-0">03</span>
                  When someone buys within {program.attributionWindowDays} days of clicking, you earn {program.commissionRate}%
                </li>
                <li className="flex gap-3">
                  <span className="text-[#006cd2] font-bold font-mono w-6 shrink-0">04</span>
                  Earnings paid via Stripe Connect — no invoicing needed
                </li>
              </ol>
            </div>
          </div>

          {/* Join card */}
          <div className="sticky top-24">
            <div className="border border-[#e4e8ed] bg-white p-6">
              <div className="text-center mb-6 pb-5 border-b border-[#e4e8ed]">
                <p className="text-4xl font-bold text-emerald-600">{program.commissionRate}%</p>
                <p className="text-sm text-[#6b7378] mt-1">commission per sale</p>
              </div>

              <div className="space-y-2.5 mb-6 text-sm">
                {[
                  { label: "Program type",    value: program.programType === "open" ? "Open — instant join" : "Approval required", valueColor: program.programType === "open" ? "text-emerald-600" : "text-amber-600" },
                  { label: "Cookie window",   value: `${program.attributionWindowDays} days`,  valueColor: "text-[#0a0a0a]" },
                  { label: "Min payout",      value: `$${program.payoutThreshold}`,             valueColor: "text-[#0a0a0a]" },
                  { label: "Currency",        value: program.currency,                          valueColor: "text-[#0a0a0a]" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-[#6b7378]">{row.label}</span>
                    <span className={`font-semibold ${row.valueColor}`}>{row.value}</span>
                  </div>
                ))}
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
                <p className="text-center text-xs text-[#6b7378] mt-3">
                  <Link href="/signup?role=creator" className="text-[#006cd2] hover:text-[#005aac]">
                    Create a free account
                  </Link>{" "}
                  to join
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
