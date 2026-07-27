import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Commission } from "@/lib/types";
import PayButton from "./PayButton";
import {
  CreditCard, Clock, CheckCircle2, TrendingUp, DollarSign,
  Info, AlertCircle,
} from "lucide-react";

export default async function PayoutsPage() {
  const session = await getSession();

  const programs = await db.findProgramsByUserId(session!.userId);
  const programIds = programs.map((p) => p.id);
  const commissions = await db.findCommissionsByProgramIds(programIds);

  const pending = commissions.filter((c) => c.status === "pending");
  const paid    = commissions.filter((c) => c.status === "paid");

  const affiliatesByProgram = new Map(
    await Promise.all(
      programs.map(async (p) => [p.id, await db.findAffiliatesByProgramId(p.id)] as const)
    )
  );

  const pendingTotal = pending.reduce((s, c) => s + c.amount, 0);
  const paidTotal    = paid.reduce((s, c) => s + c.amount, 0);
  const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="space-y-7 stagger">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payouts</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isStripeConfigured
            ? "Real Stripe transfers to affiliate accounts."
            : "Mark commissions as paid or connect Stripe for real transfers."}
        </p>
      </div>

      {/* Stripe notice */}
      {!isStripeConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stripe not configured</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Add <code className="bg-amber-100 rounded px-1">STRIPE_SECRET_KEY</code> to your environment to enable real transfers.
              Payouts currently mark commissions as paid manually.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow stat-amber">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-100 rounded-full px-2 py-0.5">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${pendingTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{pending.length} commission{pending.length !== 1 ? "s" : ""} awaiting</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow stat-emerald">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5">
              Paid
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${paidTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{paid.length} commission{paid.length !== 1 ? "s" : ""} paid out</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow stat-indigo">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${(pendingTotal + paidTotal).toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Lifetime commissions</p>
        </div>
      </div>

      {/* Pending payouts */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Pending Payouts</h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {pending.length}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-amber-600">${pendingTotal.toFixed(2)}</span>
        </div>
        {pending.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No pending commissions.</p>
          </div>
        ) : (
          <div>
            <TableHeader />
            <div className="divide-y divide-slate-100">
              {pending.map((c) => (
                <CommissionRow
                  key={c.id}
                  commission={c}
                  programs={programs}
                  affiliatesByProgram={affiliatesByProgram}
                  showAction
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paid payouts */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Paid Out</h2>
            {paid.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {paid.length}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-emerald-600">${paidTotal.toFixed(2)}</span>
        </div>
        {paid.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CreditCard className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No payouts yet.</p>
            <p className="text-xs text-slate-400 mt-1">Paid commissions will appear here.</p>
          </div>
        ) : (
          <div>
            <TableHeader />
            <div className="divide-y divide-slate-100">
              {paid.map((c) => (
                <CommissionRow
                  key={c.id}
                  commission={c}
                  programs={programs}
                  affiliatesByProgram={affiliatesByProgram}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
      <div className="col-span-2">Affiliate</div>
      <div className="text-right">Amount</div>
      <div className="text-right">Action</div>
    </div>
  );
}

function CommissionRow({
  commission,
  programs,
  affiliatesByProgram,
  showAction,
}: {
  commission: Commission;
  programs: { id: string; name: string }[];
  affiliatesByProgram: Map<string, { id: string; name: string }[]>;
  showAction?: boolean;
}) {
  const program   = programs.find((p) => p.id === commission.programId);
  const affiliates = affiliatesByProgram.get(commission.programId) ?? [];
  const affiliate  = affiliates.find((a) => a.id === commission.affiliateId);
  const avatarLetter = (affiliate?.name ?? "?").charAt(0).toUpperCase();

  const avatarColors = [
    "from-indigo-400 to-violet-500",
    "from-sky-400 to-blue-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
  ];
  const colorIndex = avatarLetter.charCodeAt(0) % avatarColors.length;

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors">
      <div className="col-span-2 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[colorIndex]} text-xs font-bold text-white shadow-sm`}>
          {avatarLetter}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{affiliate?.name ?? "—"}</p>
          <p className="text-xs text-slate-400 truncate">
            {program?.name ?? "Unknown"}
            {commission.paidAt && (
              <> · {new Date(commission.paidAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-900">${commission.amount.toFixed(2)}</p>
        {commission.stripeTransferId && (
          <p className="text-[10px] text-slate-400 font-mono truncate">{commission.stripeTransferId.slice(0, 16)}…</p>
        )}
      </div>
      <div className="text-right">
        {showAction ? (
          <PayButton commissionId={commission.id} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        )}
      </div>
    </div>
  );
}
