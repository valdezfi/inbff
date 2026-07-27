import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DollarSign, MousePointer, ShoppingBag, TrendingUp,
  ArrowRight, Plus, ChevronRight, Sparkles, CheckCircle2, Clock,
} from "lucide-react";

export default async function AffiliateDashboard() {
  const session  = await getSession();
  const affiliates = await db.findAffiliatesByUserId(session!.userId);

  let totalClicks = 0, totalPending = 0, totalPaid = 0, totalOrders = 0;
  const recentActivity: Array<{ label: string; amount: number; date: string; program: string; status: string }> = [];

  for (const aff of affiliates) {
    const [clicks, commissions] = await Promise.all([
      db.countClicksByAffiliateId(aff.id),
      db.findCommissionsByAffiliateId(aff.id),
    ]);
    totalClicks  += clicks;
    totalPending += commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    totalPaid    += commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    totalOrders  += commissions.length;
    const program = await db.findProgramById(aff.programId);
    commissions.slice(0, 3).forEach(c => {
      recentActivity.push({
        label:   c.status === "paid" ? "Commission paid" : "Commission earned",
        amount:  c.amount,
        date:    c.createdAt,
        program: program?.name ?? "—",
        status:  c.status,
      });
    });
  }
  recentActivity.sort((a, b) => b.date.localeCompare(a.date));

  // Empty state
  if (affiliates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center stagger">
        <div className="relative mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-xl shadow-sky-200">
            <Sparkles className="h-9 w-9 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Start earning commissions</h1>
        <p className="text-slate-500 mb-8 max-w-md text-sm leading-relaxed">
          Browse the marketplace, join a program, and share your unique referral link to start earning.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 hover:brightness-105 transition-all"
        >
          <Plus className="h-4 w-4" />
          Browse marketplace
        </Link>
        <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-md">
          {[
            { n: "Instant",  label: "referral links" },
            { n: "Real-time",label: "click tracking" },
            { n: "Fast",     label: "commission payouts" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center card-shadow">
              <p className="text-sm font-bold text-slate-900">{s.n}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Clicks",      value: totalClicks.toLocaleString(), icon: MousePointer, iconColor: "text-sky-600",    iconBg: "bg-sky-100",    gradClass: "stat-sky" },
    { label: "Orders Attributed", value: totalOrders,                   icon: ShoppingBag,  iconColor: "text-violet-600", iconBg: "bg-violet-100", gradClass: "stat-violet" },
    { label: "Pending Earnings",  value: `$${totalPending.toFixed(2)}`, icon: TrendingUp,   iconColor: "text-amber-600",  iconBg: "bg-amber-100",  gradClass: "stat-amber" },
    { label: "Total Paid Out",    value: `$${totalPaid.toFixed(2)}`,    icon: DollarSign,   iconColor: "text-emerald-600",iconBg: "bg-emerald-100",gradClass: "stat-emerald" },
  ];

  return (
    <div className="space-y-8 stagger">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Across {affiliates.length} program{affiliates.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-200 hover:brightness-105 transition-all"
        >
          <Plus className="h-4 w-4" />
          Find programs
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-200/80 p-5 card-shadow ${s.gradClass}`}>
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} mb-4`}>
              <s.icon className={`h-5 w-5 ${s.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links + recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <Sparkles className="h-4 w-4 text-sky-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Browse marketplace",  href: "/marketplace",        gradient: "from-sky-50 to-blue-50",     text: "text-sky-700",    hover: "hover:from-sky-100 hover:to-blue-100" },
              { label: "My programs & links", href: "/affiliate/programs", gradient: "from-indigo-50 to-violet-50",text: "text-indigo-700", hover: "hover:from-indigo-100 hover:to-violet-100" },
              { label: "View earnings",       href: "/affiliate/earnings", gradient: "from-amber-50 to-orange-50", text: "text-amber-700",  hover: "hover:from-amber-100 hover:to-orange-100" },
              { label: "Request a payout",    href: "/affiliate/payouts",  gradient: "from-emerald-50 to-teal-50", text: "text-emerald-700",hover: "hover:from-emerald-100 hover:to-teal-100" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex items-center justify-between rounded-xl bg-gradient-to-r ${a.gradient} ${a.hover} px-4 py-3 text-xs font-semibold ${a.text} transition-all`}
              >
                {a.label}
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
            <Link href="/affiliate/earnings" className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mx-auto mb-3">
                <TrendingUp className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">No activity yet</p>
              <p className="text-xs text-slate-400 mt-1">Share your referral links to start earning.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${a.status === "paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {a.status === "paid"
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <Clock className="h-4 w-4 text-amber-600" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{a.program} · {new Date(a.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${a.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                    +${a.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
