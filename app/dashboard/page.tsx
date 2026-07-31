import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Store,
  Users,
  ShoppingBag,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Plus,
  ChevronRight,
  BarChart3,
  Activity,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default async function DashboardOverview() {
  const session = await getSession();

  const [stores, programs] = await Promise.all([
    db.findStoresByUserId(session!.userId),
    db.findProgramsByUserId(session!.userId),
  ]);

  const programIds = programs.map((p) => p.id);
  const commissions = await db.findCommissionsByProgramIds(programIds);
  const pending = commissions.filter((c) => c.status === "pending");
  const paid    = commissions.filter((c) => c.status === "paid");

  const ordersByProgram = await Promise.all(programs.map((p) => db.findOrdersByProgramId(p.id)));
  const allOrders = ordersByProgram.flat();
  const totalOrders = allOrders.length;

  const pendingAmount = pending.reduce((s, c) => s + c.amount, 0);
  const paidAmount    = paid.reduce((s, c) => s + c.amount, 0);
  const totalRevenue  = allOrders.reduce((s, o) => s + o.amount, 0);

  // Empty / no-store state
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center stagger">
        <div className="relative mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-200">
            <Store className="h-9 w-9 text-white" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-md">
            <Zap className="h-3 w-3 text-white" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
          Connect your first Shopify store
        </h1>
        <p className="text-slate-500 mb-8 max-w-md text-sm leading-relaxed">
          Once connected, create an affiliate program and start inviting partners to
          promote your store — we handle tracking, attribution, and commissions automatically.
        </p>
        <Link
          href="/dashboard/connect-shopify"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:brightness-105 transition-all"
        >
          <Plus className="h-4 w-4" />
          Connect a store
        </Link>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
          {[
            { n: "2 min",  label: "avg setup time" },
            { n: "100%",   label: "automated tracking" },
            { n: "0 fees", label: "on commissions" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center card-shadow">
              <p className="text-xl font-bold text-slate-900">{s.n}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Stores Connected",
      value: stores.length,
      icon: Store,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-100",
      gradientClass: "stat-indigo",
      change: null,
      href: "/dashboard/connect-shopify",
    },
    {
      label: "Active Programs",
      value: programs.filter(p => p.status === "active").length,
      icon: Users,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
      gradientClass: "stat-violet",
      change: null,
      href: "/dashboard/programs",
    },
    {
      label: "Orders Attributed",
      value: totalOrders,
      icon: ShoppingBag,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      gradientClass: "stat-emerald",
      change: null,
      href: null,
    },
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(0)}`,
      icon: BarChart3,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-100",
      gradientClass: "stat-sky",
      change: null,
      href: null,
    },
  ];

  return (
    <div className="space-y-8 stagger">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            {programs.length > 0
              ? `${programs.length} program${programs.length > 1 ? "s" : ""} across ${stores.length} store${stores.length > 1 ? "s" : ""}`
              : "Get started by creating your first affiliate program."}
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <div className={`relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 card-shadow hover:card-shadow-md transition-all group ${s.gradientClass}`}>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} mb-4`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">{s.label}</p>
              {s.href && (
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              )}
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>{inner}</Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      {/* Commission summary + quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Payout overview */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Payout Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm text-slate-500">Pending</span>
              </div>
              <span className="text-sm font-bold text-amber-600">${pendingAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm text-slate-500">Paid out</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">${paidAmount.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-100 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-sm font-bold text-slate-900">${(pendingAmount + paidAmount).toFixed(2)}</span>
            </div>
          </div>
          <Link
            href="/dashboard/payouts"
            className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            Manage payouts
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Create new program", href: "/dashboard/programs/new",       color: "hover:bg-indigo-50 hover:text-indigo-700" },
              { label: "Connect a store",    href: "/dashboard/connect-shopify",    color: "hover:bg-violet-50 hover:text-violet-700" },
              { label: "View payouts",       href: "/dashboard/payouts",            color: "hover:bg-emerald-50 hover:text-emerald-700" },
              { label: "Browse marketplace", href: "/marketplace",                  color: "hover:bg-sky-50 hover:text-sky-700" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 transition-colors ${a.color}`}
              >
                {a.label}
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            ))}
          </div>
        </div>

        {/* Activity indicator */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Activity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Total commissions</span>
              <span className="text-sm font-bold text-slate-900">{commissions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Pending</span>
              <span className="text-sm font-semibold text-amber-600">{pending.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Paid</span>
              <span className="text-sm font-semibold text-emerald-600">{paid.length}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">All programs</span>
              <span className="text-sm font-bold text-slate-900">{programs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Programs list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Your Programs</h2>
          <Link
            href="/dashboard/programs"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 mx-auto mb-4">
              <Users className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No affiliate programs yet</p>
            <p className="text-xs text-slate-400 mb-5">Create a program to start earning with affiliates.</p>
            <Link
              href="/dashboard/programs/new"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Create your first program <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow divide-y divide-slate-100">
            {await Promise.all(
              programs.slice(0, 5).map(async (p) => {
                const store       = stores.find((s) => s.id === p.storeId);
                const affiliates  = await db.findAffiliatesByProgramId(p.id);
                const progComms   = commissions.filter((c) => c.programId === p.id);
                const earned      = progComms.reduce((s, c) => s + c.amount, 0);
                const clicks      = await db.countClicksByProgramId(p.id);

                const statusColor: Record<string, string> = {
                  active:  "badge-active",
                  paused:  "badge-paused",
                  draft:   "badge-draft",
                  deleted: "badge-rejected",
                };

                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/programs/${p.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {p.name}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[p.status] ?? "badge-draft"}`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {store?.shopDomain ?? "No store"} · {p.commissionRate}% commission
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{affiliates.length}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">affiliates</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{clicks}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">clicks</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">${earned.toFixed(2)}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">earned</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
