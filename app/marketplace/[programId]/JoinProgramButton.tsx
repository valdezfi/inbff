"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Copy, Check, Clock } from "lucide-react";
import CopyField from "@/components/CopyField";

export default function JoinProgramButton({
  programId, programType, programName,
  existingCode, existingStatus,
  appUrl, isLoggedIn,
}: {
  programId: string; programType: "open" | "approval"; programName: string;
  existingCode: string | null; existingStatus: string | null;
  appUrl: string; isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pitch, setPitch]         = useState("");
  const [done, setDone]           = useState<{ code?: string; status: string } | null>(null);

  // Already a member
  if (existingCode) {
    const url = `${appUrl}/r/${existingCode}`;
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-400 font-medium text-center">✓ You're already in this program</p>
        <CopyField value={url} dark />
      </div>
    );
  }

  // Already applied
  if (existingStatus === "pending") {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300 text-center flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" /> Application pending review
      </div>
    );
  }
  if (existingStatus === "rejected") {
    return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">Application was not approved</div>;
  }

  if (!isLoggedIn) {
    return (
      <Link href={`/signup?role=affiliate&next=/marketplace/${programId}`}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all">
        {programType === "open" ? "Join & get your link" : "Apply to this program"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  // Post-action success
  if (done) {
    if (done.code) {
      const url = `${appUrl}/r/${done.code}`;
      return (
        <div className="space-y-3 animate-fade-in-up">
          <p className="text-sm text-emerald-400 font-medium text-center">🎉 You're in! Here's your link:</p>
          <CopyField value={url} dark />
          <button onClick={() => router.push("/affiliate/dashboard")} className="w-full text-xs text-center text-white/40 hover:text-white/60 transition-colors">
            Go to your dashboard →
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-300 text-center">
        ✓ Application submitted — you'll hear back by email.
      </div>
    );
  }

  async function handleJoin() {
    setLoading(true); setError(null);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, pitch: pitch || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    if (data.status === "joined" || data.status === "already_member") {
      setDone({ code: data.referralCode, status: "joined" });
    } else {
      setDone({ status: "pending" });
    }
  }

  return (
    <div className="space-y-3">
      {programType === "approval" && (
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Why do you want to join? (optional)</label>
          <textarea
            value={pitch} onChange={e => setPitch(e.target.value)} maxLength={200} rows={3}
            placeholder="Tell the store owner a bit about your audience…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none resize-none"
          />
          <p className="text-right text-[10px] text-white/30 mt-1">{pitch.length}/200</p>
        </div>
      )}
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      <button onClick={handleJoin} disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
          : programType === "open" ? <><Copy className="h-4 w-4" /> Get my referral link</>
          : <><ArrowRight className="h-4 w-4" /> Apply to {programName}</>}
      </button>
    </div>
  );
}
