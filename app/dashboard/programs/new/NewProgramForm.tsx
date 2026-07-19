"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProgramForm({ stores }: { stores: { id: string; shopDomain: string }[] }) {
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Store</label>
        <select
          value={storeId} onChange={(e) => setStoreId(e.target.value)}
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.shopDomain}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Program name</label>
        <input
          type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Creator Referral Program"
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Commission rate (%)</label>
        <input
          type="number" required min={0} max={100} step={0.5} value={commissionRate}
          onChange={(e) => setCommissionRate(Number(e.target.value))}
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit" disabled={loading}
        className="px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create program"}
      </button>
    </form>
  );
}
