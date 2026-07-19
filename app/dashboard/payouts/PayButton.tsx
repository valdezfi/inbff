"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PayButton({ commissionId }: { commissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/payouts/${commissionId}`, { method: "POST" });
        setLoading(false);
        router.refresh();
      }}
      className="text-xs px-3 py-1.5 rounded-full border border-black/15 hover:bg-black/[.03] transition-colors disabled:opacity-60"
    >
      {loading ? "Paying…" : "Mark as paid"}
    </button>
  );
}
