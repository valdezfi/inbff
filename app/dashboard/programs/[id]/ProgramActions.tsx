"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Zap, Loader2 } from "lucide-react";

export default function ProgramActions({
  programId,
  currentStatus,
}: {
  programId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function patch(status: string) {
    setLoading(status);
    await fetch(`/api/programs/${programId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus === "draft" && (
        <button
          onClick={() => patch("active")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
        >
          {loading === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Publish
        </button>
      )}
      {currentStatus === "active" && (
        <button
          onClick={() => patch("paused")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
        >
          {loading === "paused" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
          Pause
        </button>
      )}
      {(currentStatus === "paused" || currentStatus === "draft") && currentStatus !== "draft" && (
        <button
          onClick={() => patch("active")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
        >
          {loading === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Resume
        </button>
      )}
    </div>
  );
}
