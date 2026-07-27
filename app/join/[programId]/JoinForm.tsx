"use client";
import { useState } from "react";
import { Loader2, ArrowRight, PartyPopper } from "lucide-react";
import CopyField from "@/components/CopyField";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

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
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${result.referralPath}`
        : result.referralPath;
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2 text-white">
          <PartyPopper className="h-5 w-5 text-blue-400" />
          <p className="font-semibold">You&apos;re in!</p>
        </div>
        <p className="text-sm text-white/50">
          This is your unique referral link. Share it anywhere to earn commissions.
        </p>
        <CopyField value={fullUrl} dark />
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-xs text-blue-300">
          Every order that comes through your link earns you a commission automatically.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Your name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Getting your link…</>
        ) : (
          <>Get my referral link <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </form>
  );
}
