import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import { Search, SlidersHorizontal, Users, Clock, TrendingUp, ArrowRight, Tag } from "lucide-react";
import type { MarketplaceProgram } from "@/lib/types";

export const metadata: Metadata = {
  title: "Marketplace — inBFF",
  description: "Browse affiliate programs and start earning commissions.",
};

const CATEGORIES = ["All", "Fashion", "Tech", "Health", "Beauty", "Home", "Food", "Other"];
const SORT_OPTIONS = [
  { value: "recent",     label: "Most recent" },
  { value: "commission", label: "Highest commission" },
  { value: "affiliates", label: "Most affiliates" },
];

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp       = await searchParams;
  const category = sp.category && sp.category !== "All" ? sp.category : undefined;
  const sort     = sp.sort ?? "recent";
  const search   = sp.search ?? undefined;
  const type     = sp.type ?? undefined;
  const page     = Number(sp.page ?? 1);

  const session = await getSession();
  const navUser = session
    ? { id: session.userId, name: "", email: "", role: session.role }
    : null;

  const [{ programs, total }, stats] = await Promise.all([
    db.findActivePrograms({ category, sort, search, type, page }),
    db.getMarketplaceStats(),
  ]);

  const hasMore    = page * 20 < total;
  const hasPrev    = page > 1;
  const currentCat = sp.category ?? "All";

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged = { category: currentCat, sort, search, type, page, ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== "All") params.set(k, String(v)); });
    return `/marketplace?${params.toString()}`;
  }

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]">
      <Nav initialUser={navUser} />

      {/* Header */}
      <div className="pt-24 pb-12 border-b border-[#e4e8ed]">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#3B82F6] mb-3">Marketplace</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Find a program to promote</h1>
          <p className="mt-4 text-[#6b7378] max-w-xl">
            {stats.totalPrograms} live programs · {stats.totalAffiliates.toLocaleString()} affiliates earning · ${stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} paid out
          </p>

          {/* Search */}
          <form className="mt-8 flex gap-3 max-w-lg" method="GET" action="/marketplace">
            <div className="flex-1 flex items-center gap-2 rounded-none border border-[#e4e8ed] bg-white/5 px-4 py-3">
              <Search className="h-4 w-4 text-[#6b7378] shrink-0" />
              <input
                name="search" defaultValue={search ?? ""}
                placeholder="Search programs…"
                className="flex-1 bg-transparent text-sm text-[#0a0a0a] placeholder:text-[#6b7378] focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-none bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-[#0a0a0a] hover:bg-[#2563eb] transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row">

          {/* Sidebar filters */}
          <aside className="w-full md:w-56 shrink-0 space-y-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7378] mb-3 flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Category
              </p>
              <div className="space-y-1">
                {CATEGORIES.map(cat => (
                  <Link key={cat} href={buildUrl({ category: cat, page: 1 })}
                    className={`block rounded-none px-3 py-2 text-sm transition-colors ${currentCat === cat ? "bg-[#3B82F6]/15 text-[#3B82F6] font-medium" : "text-[#6b7378] hover:text-[#006cd2] hover:bg-[#f0f7ff]"}`}>
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7378] mb-3 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3" /> Sort
              </p>
              <div className="space-y-1">
                {SORT_OPTIONS.map(opt => (
                  <Link key={opt.value} href={buildUrl({ sort: opt.value, page: 1 })}
                    className={`block rounded-none px-3 py-2 text-sm transition-colors ${sort === opt.value ? "bg-[#3B82F6]/15 text-[#3B82F6] font-medium" : "text-[#6b7378] hover:text-[#006cd2] hover:bg-[#f0f7ff]"}`}>
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7378] mb-3">Program type</p>
              <div className="space-y-1">
                {[["", "All types"], ["open", "Open — instant join"], ["approval", "Approval-based"]].map(([val, label]) => (
                  <Link key={val} href={buildUrl({ type: val || undefined, page: 1 })}
                    className={`block rounded-none px-3 py-2 text-sm transition-colors ${(type ?? "") === val ? "bg-[#3B82F6]/15 text-[#3B82F6] font-medium" : "text-[#6b7378] hover:text-[#006cd2] hover:bg-[#f0f7ff]"}`}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#6b7378]">{total} program{total !== 1 ? "s" : ""}</p>
            </div>

            {programs.length === 0 ? (
              <div className="rounded-none border border-[#e4e8ed] p-16 text-center">
                <p className="text-[#6b7378]">No programs match your filters.</p>
                <Link href="/marketplace" className="mt-4 inline-block text-sm text-[#3B82F6] hover:text-blue-300">Clear filters</Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {programs.map(p => <ProgramCard key={p.id} program={p} />)}
              </div>
            )}

            {/* Pagination */}
            {(hasMore || hasPrev) && (
              <div className="flex items-center justify-between mt-10">
                {hasPrev
                  ? <Link href={buildUrl({ page: page - 1 })} className="rounded-none border border-[#e4e8ed] px-4 py-2 text-sm text-[#6b7378] hover:bg-[#f0f7ff]">← Previous</Link>
                  : <span />}
                {hasMore
                  ? <Link href={buildUrl({ page: page + 1 })} className="rounded-none border border-[#e4e8ed] px-4 py-2 text-sm text-[#6b7378] hover:bg-[#f0f7ff]">Next →</Link>
                  : <span />}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function ProgramCard({ program }: { program: MarketplaceProgram }) {
  return (
    <Link href={`/marketplace/${program.id}`}
      className="group flex flex-col rounded-none border border-[#e4e8ed] bg-white p-6 hover:border-[#3B82F6]/50 hover:shadow-md transition-all">
      {program.bannerUrl && (
        <img src={program.bannerUrl} alt="" className="w-full h-32 object-cover rounded-none mb-4" />
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6b7378] truncate">{program.shopDomain}</p>
          <h3 className="font-semibold text-[#0a0a0a] text-base leading-snug mt-0.5 group-hover:text-[#3B82F6] transition-colors">{program.name}</h3>
        </div>
        <span className={`shrink-0 rounded-none px-2.5 py-1 text-[11px] font-medium ${program.programType === "open" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
          {program.programType === "open" ? "Open" : "Apply"}
        </span>
      </div>

      {program.description && (
        <p className="text-xs text-[#6b7378] mb-4 line-clamp-2">{program.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-[#6b7378] border-t border-[#e4e8ed] pt-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
            <TrendingUp className="h-3.5 w-3.5" />{program.commissionRate}%
          </span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{program.affiliateCount}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{program.attributionWindowDays}d</span>
        </div>
        <span className="flex items-center gap-1 text-[#3B82F6] group-hover:gap-2 transition-all">
          View <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-3">
        <span className="rounded-none bg-white/5 border border-[#e4e8ed] px-2.5 py-0.5 text-[11px] text-[#6b7378]">{program.category}</span>
      </div>
    </Link>
  );
}
