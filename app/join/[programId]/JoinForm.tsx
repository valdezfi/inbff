"use client";
import { useState } from "react";
import CopyField from "@/components/CopyField";

export default function JoinForm({ programId }: { programId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ referralPath: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, name, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setResult(data);
  }

  if (result) {
    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${result.referralPath}` : result.referralPath;
    return (
      <div className="rounded-xl border border-black/10 p-6">
        <p className="font-medium mb-1">You&apos;re in 🎉</p>
        <p className="text-sm text-foreground/60 mb-4">This is your unique referral link — share it anywhere.</p>
        <CopyField value={fullUrl} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Name</label>
        <input
          type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit" disabled={loading}
        className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
      >
        {loading ? "Joining…" : "Get my referral link"}
      </button>
    </form>
  );
}
