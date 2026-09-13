import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import CopyField from "@/components/CopyField";
import {
  TrendingUp, MousePointer, ShoppingBag, ExternalLink,
  Plus, CheckCircle2, PauseCircle, Sparkles, Link2,
} from "lucide-react";

export default async function AffiliateProgramsPage() {
  const session    = await getSession();
  const affiliates = await db.findAffiliatesByUserId(session!.userId);
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const rows = await Promise.all(
    affiliates.map(async (aff) => {
      const program = await db.findProgramById(aff.programId);
      const [clicks, commissions] = await Promise.all([
        db.countClicksByAffiliateId(aff.id),
        db.findCommissionsByAffiliateId(aff.id),
      ]);
      const pending = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
      const paid    = commissions.filter(c => c.status === "paid").reduce((s, c)    => s + c.amount, 0);
      const stores  = program ? await db.findStoresByUserId(program.userId) : [];
      const store   = stores.find(s => s.id === program?.storeId);
      return { aff, program, store, clicks, orders: commissions.length, pending, paid };
    })
  );

  return (
    <div className="space-y-7 stagger">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Programs</h1>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length} program{rows.length !== 1 ? "s" : ""} joined
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-none bg-gradient-to-r bg-[#006cd2] px-4 py-2.5 text-sm font-semibold text-white shadow-md  hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Find more
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-none border border-dashed border-slate-300 bg-white p-16 text-center card-shadow">
          <div className="flex h-16 w-16 items-center justify-center rounded-none bg-gradient-to-br bg-[#006cd2] mx-auto mb-5 shadow-lg ">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-2 text-base">No programs joined yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
            Browse the marketplace and join affiliate programs to get your unique referral links.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-none bg-gradient-to-r bg-[#006cd2] px-5 py-2.5 text-sm font-semibold text-white shadow-md  hover:opacity-90 transition-all"
          >
            Browse the marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ aff, program, store, clicks, orders, pending, paid }) => (
            <div key={aff.id} className="rounded-none border border-slate-200/80 bg-white overflow-hidden card-shadow  transition-all">
              {/* Card header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-gradient-to-br bg-[#006cd2] shadow-md">
                    <Link2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{program?.name ?? "—"}</h3>
                      {aff.status === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-none bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-none bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          <PauseCircle className="h-3 w-3" /> Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {store?.shopDomain ?? "Unknown store"} ·{" "}
                      <span className="text-[#006cd2] font-medium">{program?.commissionRate ?? '—'}%</span> commission
                    </p>
                  </div>
                </div>
                {store && (
                  <a
                    href={`https://${store.shopDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#006cd2] hover:text-[#0053a3] font-medium transition-colors"
                  >
                    Visit store <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50/50">
                {[
                  { icon: MousePointer, label: "Clicks",   value: clicks,                    color: "text-[#006cd2]",     bg: "bg-[#e8f4fb]" },
                  { icon: ShoppingBag,  label: "Orders",   value: orders,                    color: "text-[#006cd2]",  bg: "bg-[#e8f2fb]" },
                  { icon: TrendingUp,   label: "Pending",  value: `$${pending.toFixed(2)}`,  color: "text-amber-600",   bg: "bg-amber-50" },
                  { icon: TrendingUp,   label: "Paid",     value: `$${paid.toFixed(2)}`,     color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center py-4 gap-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-none ${s.bg}`}>
                      <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                    </div>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Referral link */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Your Referral Link</p>
                <CopyField value={`${appUrl}/r/${aff.referralCode}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
