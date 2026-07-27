"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, DollarSign, Clock, Info } from "lucide-react";

interface ProgramRow {
  affiliateId: string; programId: string; programName: string;
  commissionRate: number; payoutThreshold: number; currency: string;
  pending: number; paid: number;
}

export default function AffiliatePayoutClient({
  programs, stripeConnected, hasStripe,
}: {
  programs: ProgramRow[];
  stripeConnected: boolean;
  hasStripe: boolean;
}) {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);
  const [payingId, setPayingId]     = useState<string | null>(null);
  const [paid, setPaid]             = useState<Set<string>>(new Set());
  const [error, setError]           = useState<string | null>(null);

  const totalPending = programs.reduce((s, p) => s + p.pending, 0);
  const totalPaid    = programs.reduce((s, p) => s + p.paid, 0);

  async function handleOnboard() {
    setOnboarding(true);
    const res = await fetch("/api/affiliate/stripe/onboard", { method: "POST" });
    const data = await res.json();
    setOnboarding(false);
    if (res.ok && data.url) window.location.href = data.url;
    else setError(data.error ?? "Failed to start Stripe onboarding.");
  }

  async function handlePayout(programId: string) {
    setPayingId(programId); setError(null);
    const res = await fetch("/api/affiliate/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId }),
    });
    const data = await res.json();
    setPayingId(null);
    if (res.ok) { setPaid(prev => new Set([...prev, programId])); setTimeout(() => router.refresh(), 800); }
    else setError(data.error ?? "Payout failed.");
  }

  return (
    <div className="space-y-8 stagger">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">
          {hasStripe ? "Request your earnings via Stripe Connect" : "Track your earnings and request payouts"}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 mb-3"><Clock className="h-4 w-4 text-amber-600" /></div>
          <p className="text-2xl font-semibold text-gray-900">${totalPending.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending across {programs.filter(p => p.pending > 0).length} program{programs.filter(p => p.pending > 0).length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 mb-3"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          <p className="text-2xl font-semibold text-gray-900">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total paid out</p>
        </div>
      </div>

      {/* Stripe Connect or info banner */}
      {hasStripe ? (
        <div className={`rounded-xl border p-5 ${stripeConnected ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}>
          <div className="flex items-start gap-3">
            <CreditCard className={`h-5 w-5 shrink-0 mt-0.5 ${stripeConnected ? "text-emerald-600" : "text-blue-600"}`} />
            <div className="flex-1">
              {stripeConnected ? (
                <p className="text-sm font-semibold text-emerald-800">✓ Stripe payout account connected</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-800">Connect Stripe to receive payouts</p>
                  <p className="text-sm text-blue-700 mt-1">You need a Stripe Connect account to receive transfers directly to your bank.</p>
                  <button onClick={handleOnboard} disabled={onboarding}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                    {onboarding ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</> : <><ExternalLink className="h-4 w-4" /> Set up Stripe</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Manual payouts mode</p>
            <p className="text-sm text-amber-700 mt-1">
              Stripe is not configured on this platform. Payouts are processed manually by the program creator and marked as paid when complete.
            </p>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Per-program payouts */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">By program</h2>
        </div>
        {programs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">No programs yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {programs.map(p => {
              const canPay = p.pending >= p.payoutThreshold;
              const isPaid = paid.has(p.programId);
              // Allow payout request regardless of Stripe — the API handles both modes
              const isDisabled = !canPay || payingId === p.programId || (hasStripe && !stripeConnected);
              return (
                <div key={p.programId} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.programName}</p>
                    <p className="text-xs text-gray-500">{p.commissionRate}% · min ${p.payoutThreshold} · {p.currency}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pending: <span className="text-amber-600 font-medium">${p.pending.toFixed(2)}</span> · Paid: <span className="text-emerald-600 font-medium">${p.paid.toFixed(2)}</span></p>
                  </div>
                  <div className="ml-4">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => handlePayout(p.programId)}
                          disabled={isDisabled}
                          title={
                            !canPay ? `Need $${p.payoutThreshold} minimum (have $${p.pending.toFixed(2)})` :
                            (hasStripe && !stripeConnected) ? "Connect Stripe first to receive payouts" : ""
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                          {payingId === p.programId ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</> : <><DollarSign className="h-3.5 w-3.5" /> Request ${p.pending.toFixed(2)}</>}
                        </button>
                        {!canPay && (
                          <p className="text-[10px] text-gray-400">Need ${(p.payoutThreshold - p.pending).toFixed(2)} more</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
