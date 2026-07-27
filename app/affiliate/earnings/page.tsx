import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckCircle2, Clock, DollarSign, TrendingUp } from "lucide-react";

export default async function AffiliateEarningsPage() {
  const session    = await getSession();
  const affiliates = await db.findAffiliatesByUserId(session!.userId);

  const allCommissions: Array<{
    id: string; amount: number; rate: number; status: string;
    createdAt: string; paidAt: string | null; programName: string;
    stripeTransferId: string | null;
  }> = [];

  for (const aff of affiliates) {
    const commissions = await db.findCommissionsByAffiliateId(aff.id);
    for (const c of commissions) {
      const program = await db.findProgramById(c.programId);
      allCommissions.push({ ...c, programName: program?.name ?? "—" });
    }
  }
  allCommissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pending      = allCommissions.filter(c => c.status === "pending");
  const paid         = allCommissions.filter(c => c.status === "paid");
  const totalPending = pending.reduce((s, c) => s + c.amount, 0);
  const totalPaid    = paid.reduce((s, c)    => s + c.amount, 0);

  const summaryCards = [
    { label: "Pending",  value: `$${totalPending.toFixed(2)}`, count: pending.length, icon: Clock,        iconColor: "text-amber-600",   iconBg: "bg-amber-100",   gradClass: "stat-amber" },
    { label: "Paid Out", value: `$${totalPaid.toFixed(2)}`,    count: paid.length,    icon: CheckCircle2, iconColor: "text-emerald-600", iconBg: "bg-emerald-100", gradClass: "stat-emerald" },
    { label: "Total",    value: `$${(totalPending + totalPaid).toFixed(2)}`, count: allCommissions.length, icon: DollarSign, iconColor: "text-sky-600", iconBg: "bg-sky-100", gradClass: "stat-sky" },
  ];

  return (
    <div className="space-y-7 stagger">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Earnings</h1>
        <p className="text-sm text-slate-500 mt-1">Full commission history across all programs</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-200/80 p-6 card-shadow ${s.gradClass}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${s.iconBg} ${s.iconColor}`}>
                {s.count} total
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Earnings table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <TrendingUp className="h-4 w-4 text-sky-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">All Commissions</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {allCommissions.length}
            </span>
          </div>
        </div>

        {allCommissions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <DollarSign className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No earnings yet</p>
            <p className="text-xs text-slate-400 mt-1">Start sharing your referral links to earn commissions.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-2">Program</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-100">
              {allCommissions.map((c) => {
                const initial = c.programName.charAt(0).toUpperCase();
                const colors = [
                  "from-indigo-400 to-violet-500",
                  "from-sky-400 to-blue-500",
                  "from-emerald-400 to-teal-500",
                  "from-amber-400 to-orange-500",
                ];
                const colorIdx = initial.charCodeAt(0) % colors.length;
                return (
                  <div key={c.id} className="grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${colors[colorIdx]} text-xs font-bold text-white shadow-sm`}>
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.programName}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()} · <span className="text-indigo-600">{c.rate}%</span> rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${c.amount.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      {c.status === "paid" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                          {c.paidAt && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(c.paidAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
