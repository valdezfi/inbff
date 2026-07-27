"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export default function NewProgramForm({
  stores,
}: {
  stores: { id: string; shopDomain: string }[];
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [name, setName] = useState("");
  const [commissionRate, setCommissionRate] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, name, commissionRate: Number(commissionRate) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(`/dashboard/programs/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {stores.length > 1 && (
        <div>
          <label className={labelCls}>Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className={inputCls + " bg-white"}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shopDomain}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Program name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Creator Referral Program"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Commission rate</label>
        <div className="relative">
          <input
            type="number"
            required
            min={0}
            max={100}
            step={0.5}
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className={inputCls + " pr-8"}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            %
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Affiliates earn {commissionRate}% on every order they refer.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            Create program <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
