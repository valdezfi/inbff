"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Building2, Sparkles, Check } from "lucide-react";

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

const ROLES = [
  {
    value: "brand" as const,
    icon: Building2,
    title: "I'm a Brand",
    subtitle: "I sell products and want affiliates to promote them",
    perks: ["Connect your Shopify store", "Create affiliate programs", "Set commissions & track orders", "Manage payouts"],
  },
  {
    value: "creator" as const,
    icon: Sparkles,
    title: "I'm a Creator",
    subtitle: "I create content and want to earn by promoting brands",
    perks: ["Browse brand affiliate programs", "Get unique referral links", "Track your clicks & earnings", "Request payouts"],
  },
];

function SignupInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const defaultRole  = (searchParams.get("role") === "brand" ? "brand" : "creator") as "brand" | "creator";
  const nextUrl      = searchParams.get("next") ?? "";

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Something went wrong."); return; }
    if (data.message) { router.push("/verify-email?sent=1"); return; }
    const redirect = nextUrl || data.redirectTo || (role === "brand" ? "/dashboard/connect-shopify" : "/marketplace");
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <LogoMark />
          <span className="font-bold text-[#0a0a0a] tracking-tight text-lg">inBFF</span>
        </Link>

        {/* Step 1: Role */}
        {step === "role" && (
          <div>
            <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1 tracking-tight">Create your account</h1>
            <p className="text-sm text-[#6b7378] mb-8">How do you want to use inBFF?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`relative flex flex-col p-5 text-left transition-all border-2 ${
                      selected ? "border-[#006cd2] bg-[#f0f7ff]" : "border-[#e4e8ed] bg-white hover:border-[#006cd2]/40"
                    }`}>
                    {selected && (
                      <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center bg-[#006cd2]">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <div className={`flex h-9 w-9 items-center justify-center mb-3 ${selected ? "bg-[#006cd2]" : "bg-[#e4e8ed]"}`}>
                      <r.icon className={`h-5 w-5 ${selected ? "text-white" : "text-[#6b7378]"}`} />
                    </div>
                    <p className="font-bold text-[#0a0a0a] text-sm mb-1">{r.title}</p>
                    <p className="text-xs text-[#6b7378] mb-3 leading-relaxed">{r.subtitle}</p>
                    <ul className="space-y-1.5">
                      {r.perks.map(p => (
                        <li key={p} className="flex items-center gap-1.5 text-[11px] text-[#6b7378]">
                          <Check className={`h-3 w-3 shrink-0 ${selected ? "text-[#006cd2]" : "text-[#6b7378]"}`} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep("details")}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
              Continue as {role === "brand" ? "Brand" : "Creator"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div>
            <button type="button" onClick={() => setStep("role")}
              className="text-xs text-[#6b7378] hover:text-[#0a0a0a] mb-6 flex items-center gap-1 transition-colors">
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const r = ROLES.find(r => r.value === role)!;
                return (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center bg-[#006cd2]">
                      <r.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-[#0a0a0a] tracking-tight">
                        {role === "brand" ? "Create Brand Account" : "Create Creator Account"}
                      </h1>
                      <p className="text-xs text-[#6b7378]">{r.subtitle}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="border border-[#e4e8ed] bg-white p-7">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    {role === "brand" ? "Brand / Company name" : "Your name"}
                  </label>
                  <input type="text" required autoComplete="name"
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder={role === "brand" ? "Acme Inc." : "Your full name"}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Email</label>
                  <input type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Password</label>
                  <input type="password" required minLength={8} autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" className={inputCls} />
                </div>

                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all disabled:opacity-60 mt-2">
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                    : <>Create account <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-[#6b7378] mt-4">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-[#6b7378] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#006cd2] hover:text-[#005aac] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupInner /></Suspense>;
}
