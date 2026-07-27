"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Check, Loader2, AlertCircle } from "lucide-react";

export default function PayButton({ commissionId }: { commissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Check className="h-3 w-3" /> Paid
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch(`/api/payouts/${commissionId}`, { method: "POST" });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error ?? "Payment failed. Please try again.");
            } else {
              setDone(true);
              setTimeout(() => router.refresh(), 600);
            }
          } catch {
            setError("Network error. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all disabled:opacity-50 shadow-sm card-shadow"
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Paying…
          </>
        ) : (
          <>
            <CreditCard className="h-3 w-3" />
            Pay out
          </>
        )}
      </button>
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-600 max-w-[180px] text-right">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
