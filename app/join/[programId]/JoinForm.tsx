"use client";
import { useState } from "react";
import { Loader2, ArrowRight, PartyPopper } from "lucide-react";
import CopyField from "@/components/CopyField";

const inputCls =
  "w-full border border-[#e4e8ed] bg-white px-4 py-3 text-sm text-[#0a0a0a] " +
  "placeholder:text-[#6b7378] focus:border-[#006cd2] focus:outline-none " +
  "focus:ring-2 focus:ring-[#006cd2]/10 transition-all";

export default function JoinForm({ programId }: { programId: string }) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ referralPath: string } | null>(null);

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
    if (!res.ok) { setError(data.error || "Something went wrong."); return; }
    setResult(data);
  }

  if (result) {
    const fullUrl = typeof window !== "undefined"
      ? `${window.location.origin}${result.referralPath}`
      : result.referralPath;
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2 text-[#006cd2]">
          <PartyPopper className="h-5 w-5" />
          <p className="font-semibold text-[#0a0a0a]">You&apos;re in!</p>
        </div>
        <p className="text-sm text-[#6b7378]">This is your unique referral link. Share it anywhere to earn commissions.</p>
        <CopyField value={fullUrl} />
        <div className="border border-[#006cd2]/20 bg-[#f0f7ff] px-4 py-3 text-xs text-[#006cd2]">
          Every order that comes through your link earns you a commission automatically.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Your name</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="Your full name" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" className={inputCls} />
      </div>
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all disabled:opacity-60">
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Getting your link…</>
          : <>Get my referral link <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
