"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BulkPayButton({ programId, pendingCount }: {
  programId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<{ paid: number; skipped: number; failed: number } | null>(null);
  const [error,   setError]     = useState<string | null>(null);

  if (pendingCount === 0) return null;

  async function handleBulkPay() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res  = await fetch("/api/payouts/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ programId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bulk payout failed.");
      } else {
        setResult(data);
        setTimeout(() => router.refresh(), 800);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleBulkPay}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-sm shadow-indigo-200"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Paying {pendingCount}…</>
        ) : (
          <><Zap className="h-3.5 w-3.5" /> Pay all ({pendingCount})</>
        )}
      </button>

      {result && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {result.paid} paid
          {result.skipped > 0 && `, ${result.skipped} skipped (no Stripe)`}
          {result.failed  > 0 && `, ${result.failed} failed`}
        </span>
      )}

      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-600 max-w-[200px] text-right">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
