"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Zap } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white " +
  "placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none " +
  "focus:ring-2 focus:ring-blue-500/20 transition-all";

function LoginInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextUrl      = searchParams.get("next") ?? "";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.code === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in. Check your inbox.");
      } else {
        setError(data.error || "Invalid email or password.");
      }
      return;
    }

    // Use next param if present, otherwise use role-based redirect
    const redirect = nextUrl || data.redirectTo ||
      (data.role === "brand" ? "/dashboard" : "/affiliate/dashboard");
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20 bg-[#0A0A0B] min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in-up">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
            <Zap className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-bold text-white tracking-tight">inBFF</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-white/50 mb-8">Sign in to your inBFF account.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className={inputCls}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-60 mt-2"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                : <>Sign in <ArrowRight className="h-4 w-4" /></>
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Demo accounts</p>
            <div className="space-y-2">
              {[
                { role: "Brand",   email: "creator@demo.com",   password: "demo1234", color: "text-indigo-300" },
                { role: "Creator", email: "affiliate@demo.com", password: "demo1234", color: "text-purple-300" },
              ].map(d => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="w-full flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 transition-colors text-left"
                >
                  <span className={`text-xs font-semibold ${d.color}`}>{d.role}</span>
                  <span className="text-[11px] text-white/30 font-mono">{d.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/20">Click a row to autofill · password: demo1234</p>
          </div>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          No account yet?{" "}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
