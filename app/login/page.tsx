"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

function LogoMark() {
  return (
    <svg viewBox="0 0 42 34" aria-hidden="true" style={{ width: 28, fill: "#006cd2" }}>
      <polygon points="12,0 30,0 33.2,3.2 15.2,3.2" />
      <polygon points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
      <polygon points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
      <polygon points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
      <polygon points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
      <polygon points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
    </svg>
  );
}

const inputCls =
  "w-full border border-[#e4e8ed] bg-white px-4 py-3 text-sm text-[#0a0a0a] " +
  "placeholder:text-[#6b7378] focus:border-[#006cd2] focus:outline-none " +
  "focus:ring-2 focus:ring-[#006cd2]/10 transition-all";

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.code === "EMAIL_NOT_VERIFIED"
        ? "Please verify your email before signing in. Check your inbox."
        : (data.error || "Invalid email or password."));
      return;
    }
    const redirect = nextUrl || data.redirectTo || (data.role === "brand" ? "/dashboard" : "/affiliate/dashboard");
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-20"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <LogoMark />
          <span className="font-bold text-[#0a0a0a] tracking-tight text-lg">Referly</span>
        </Link>

        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1 tracking-tight">Welcome back</h1>
        <p className="text-sm text-[#6b7378] mb-8">Sign in to your Referly account.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Email</label>
            <input type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Password</label>
            <input type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" className={inputCls} />
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all disabled:opacity-60 mt-2">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="text-sm text-[#6b7378] mt-6 text-center">
          No account yet?{" "}
          <Link href="/signup" className="text-[#006cd2] hover:text-[#005aac] font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
