"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Building2, Sparkles, Check, Zap } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white " +
  "placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none " +
  "focus:ring-2 focus:ring-blue-500/20 transition-all";

const ROLES = [
  {
    value: "brand" as const,
    icon: Building2,
    title: "I'm a Brand",
    subtitle: "I sell products and want affiliates to promote them",
    perks: ["Connect your Shopify store", "Create affiliate programs", "Set commissions & track orders", "Manage payouts"],
    color: "border-indigo-500/60 bg-indigo-500/10",
    badge: "bg-indigo-500/20 text-indigo-300",
  },
  {
    value: "creator" as const,
    icon: Sparkles,
    title: "I'm a Creator",
    subtitle: "I create content and want to earn by promoting brands",
    perks: ["Browse brand affiliate programs", "Get unique referral links", "Track your clicks & earnings", "Request payouts"],
    color: "border-purple-500/60 bg-purple-500/10",
    badge: "bg-purple-500/20 text-purple-300",
  },
];

function SignupInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const defaultRole = (searchParams.get("role") === "brand" ? "brand" : "creator") as "brand" | "creator";
  const nextUrl     = searchParams.get("next") ?? "";

  const [role,     setRole]     = useState<"brand" | "creator">(defaultRole);
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<"role" | "details">("role");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    if (data.message) {
      // Email verification required
      router.push("/verify-email?sent=1");
      return;
    }

    const redirect = nextUrl || data.redirectTo ||
      (role === "brand" ? "/dashboard/connect-shopify" : "/marketplace");
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 bg-[#0A0A0B] min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
              <Zap className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-bold text-white tracking-tight">inBFF</span>
          </Link>
        </div>

        {/* Step 1: Role selection */}
        {step === "role" && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Join inBFF</h1>
            <p className="text-sm text-white/50 mb-8">Choose how you want to use inBFF</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`relative flex flex-col rounded-2xl border p-5 text-left transition-all hover:scale-[1.01] ${
                      selected
                        ? r.color
                        : "border-white/10 bg-white/[0.03] hover:bg-white/5 hover:border-white/20"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${selected ? r.badge : "bg-white/8"}`}>
                      <r.icon className={`h-5 w-5 ${selected ? "" : "text-white/50"}`} />
                    </div>
                    <p className="font-bold text-white text-sm mb-1">{r.title}</p>
                    <p className="text-xs text-white/50 mb-3 leading-relaxed">{r.subtitle}</p>
                    <ul className="space-y-1.5">
                      {r.perks.map(p => (
                        <li key={p} className="flex items-center gap-1.5 text-[11px] text-white/40">
                          <Check className="h-3 w-3 text-white/30 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep("details")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
            >
              Continue as {role === "brand" ? "Brand" : "Creator"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Account details */}
        {step === "details" && (
          <div>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-xs text-white/40 hover:text-white/60 mb-6 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const r = ROLES.find(r => r.value === role)!;
                return (
                  <>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${r.badge}`}>
                      <r.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white tracking-tight">
                        {role === "brand" ? "Create Brand Account" : "Create Creator Account"}
                      </h1>
                      <p className="text-xs text-white/40">{r.subtitle}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7 shadow-2xl">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">
                    {role === "brand" ? "Brand / Company name" : "Your name"}
                  </label>
                  <input
                    type="text" required autoComplete="name"
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder={role === "brand" ? "Acme Inc." : "Your full name"}
                    className={inputCls}
                  />
                </div>
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
                    type="password" required minLength={8} autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" className={inputCls}
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
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                    : <>Create account <ArrowRight className="h-4 w-4" /></>
                  }
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-white/30 mt-4">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
