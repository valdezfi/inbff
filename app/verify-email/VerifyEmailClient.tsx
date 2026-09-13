"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";

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

type State = { status: "verifying" } | { status: "success" } | { status: "error"; message: string; expired?: boolean };

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const sent  = searchParams.get("sent");

  const [state, setState] = useState<State>({ status: "verifying" });
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (sent === "1") {
      setState({ status: "error", message: "" }); // will show "check inbox" UI
      return;
    }
    if (!token) {
      setState({ status: "error", message: "No verification token found. Use the full link from your email." });
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        setState({ status: "success" });
        setTimeout(() => router.push("/dashboard/connect-shopify"), 2000);
      } else {
        setState({ status: "error", message: data.error ?? "Verification failed.", expired: data.code === "TOKEN_EXPIRED" });
      }
    }).catch(() => setState({ status: "error", message: "Something went wrong. Please try again." }));
  }, [token, sent, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResendLoading(false);
    setResendDone(true);
  }

  const inputCls = "w-full border border-[#e4e8ed] bg-white px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#6b7378] focus:border-[#006cd2] focus:outline-none focus:ring-2 focus:ring-[#006cd2]/10 transition-all";

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-20"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="w-full max-w-sm animate-fade-in-up">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <LogoMark />
          <span className="font-bold text-[#0a0a0a] tracking-tight text-lg">Referly</span>
        </Link>

        <div className="border border-[#e4e8ed] bg-white p-8 text-center">

          {/* Sent confirmation */}
          {sent === "1" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-[#e8f2fb] mx-auto mb-5">
                <Mail className="h-7 w-7 text-[#006cd2]" />
              </div>
              <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Check your inbox</h1>
              <p className="text-sm text-[#6b7378] mb-6">
                We&apos;ve sent a verification link to your email. Click it to activate your account.
              </p>
              <p className="text-xs text-[#6b7378]">Didn&apos;t receive it? Check your spam folder or{" "}
                <Link href="/verify-email" className="text-[#006cd2] hover:text-[#005aac]">request a new link</Link>.
              </p>
            </>
          )}

          {/* Verifying */}
          {sent !== "1" && state.status === "verifying" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-[#e8f2fb] mx-auto mb-5">
                <Loader2 className="h-7 w-7 text-[#006cd2] animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Verifying your email…</h1>
              <p className="text-sm text-[#6b7378]">This only takes a moment.</p>
            </>
          )}

          {/* Success */}
          {state.status === "success" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-emerald-50 mx-auto mb-5">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Email verified!</h1>
              <p className="text-sm text-[#6b7378] mb-5">Your account is confirmed. Taking you to your dashboard…</p>
              <div className="flex items-center justify-center gap-2 text-xs text-[#6b7378]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…
              </div>
            </>
          )}

          {/* Error (but not sent) */}
          {sent !== "1" && state.status === "error" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center bg-red-50 mx-auto mb-5">
                <XCircle className="h-7 w-7 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Verification failed</h1>
              <p className="text-sm text-[#6b7378] mb-6">{state.message}</p>

              {!resendDone ? (
                <form onSubmit={handleResend} className="text-left space-y-3">
                  <p className="text-xs text-[#6b7378] text-center mb-3">Enter your email to get a fresh link</p>
                  <input type="email" required value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                  <button type="submit" disabled={resendLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#005aac] transition-all disabled:opacity-60">
                    {resendLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                      : <><Mail className="h-4 w-4" /> Resend verification email</>}
                  </button>
                </form>
              ) : (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✓ New verification email sent — check your inbox.
                </div>
              )}

              <div className="mt-5 border-t border-[#e4e8ed] pt-5">
                <Link href="/signup"
                  className="inline-flex items-center gap-1.5 text-sm text-[#006cd2] hover:text-[#005aac] transition-colors">
                  Create a new account <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
