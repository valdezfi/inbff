import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users, Plus, ChevronRight, ArrowRight, MousePointer,
  ShoppingBag, BarChart3, Sparkles,
} from "lucide-react";

export default async function ProgramsPage() {
  const session = await getSession();
  const [programs, stores] = await Promise.all([
    db.findProgramsByUserId(session!.userId),
    db.findStoresByUserId(session!.userId),
  ]);

  const statusColors: Record<string, string> = {
    active:  "badge-active",
    paused:  "badge-paused",
    draft:   "badge-draft",
    deleted: "badge-rejected",
  };

  const programTypeColors: Record<string, string> = {
    open:     "badge-open",
    approval: "badge-approval",
  };

  type ProgramRow = {
    id: string;
    name: string;
    status: string;
    programType: string;
    commissionRate: number;
    attributionWindowDays: number;
    storeId: string;
    storeDomain: string | undefined;
    affiliateCount: number;
    clicks: number;
  };

  const rows: ProgramRow[] = await Promise.all(
    programs.map(async (p) => {
      const store      = stores.find((s) => s.id === p.storeId);
      const affiliates = await db.findAffiliatesByProgramId(p.id);
      const clicks     = await db.countClicksByProgramId(p.id);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        programType: p.programType,
        commissionRate: p.commissionRate,
        attributionWindowDays: p.attributionWindowDays,
        storeId: p.storeId,
        storeDomain: store?.shopDomain,
        affiliateCount: affiliates.length,
        clicks,
      };
    })
  );

  return (
    <div className="space-y-7 stagger">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Programs</h1>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length > 0
              ? `${rows.length} affiliate program${rows.length > 1 ? "s" : ""}`
              : "No programs yet — create one to get started"}
          </p>
        </div>
        <Link
          href="/dashboard/programs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:brightness-105 transition-all"
        >
          <Plus className="h-4 w-4" />
          New program
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center card-shadow">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mx-auto mb-5 shadow-lg shadow-indigo-200">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-2 text-base">No affiliate programs yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
            Create a program, set your commission rate, and start inviting affiliates to promote your store.
          </p>
          <Link
            href="/dashboard/programs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:brightness-105 transition-all"
          >
            Create your first program
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/programs/${p.id}`}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-5 card-shadow hover:card-shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Program icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[p.status] ?? "badge-draft"}`}>
                      {p.status}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${programTypeColors[p.programType] ?? "badge-open"}`}>
                      {p.programType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {p.storeDomain ?? "No store"} ·{" "}
                    <span className="text-indigo-600 font-medium">{p.commissionRate}%</span> commission ·{" "}
                    {p.attributionWindowDays}d window
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <span className="font-semibold text-slate-700">{p.affiliateCount}</span>
                    <span className="text-slate-400">affiliates</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50">
                      <MousePointer className="h-3.5 w-3.5 text-sky-400" />
                    </div>
                    <span className="font-semibold text-slate-700">{p.clicks}</span>
                    <span className="text-slate-400">clicks</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Programs", value: rows.length,                                          icon: BarChart3,   color: "text-indigo-600",  bg: "bg-indigo-50" },
            { label: "Active",         value: rows.filter(p => p.status === "active").length,       icon: Users,       color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Open Programs",  value: rows.filter(p => p.programType === "open").length,    icon: ShoppingBag, color: "text-violet-600",  bg: "bg-violet-50" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 card-shadow">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
