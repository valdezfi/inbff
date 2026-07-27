"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";

type State =
  | { status: "verifying" }
  | { status: "success" }
  | { status: "error"; message: string; expired?: boolean };

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>({ status: "verifying" });
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({
        status: "error",
        message:
          "No verification token found. Check that you used the full link from your email.",
      });
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setState({ status: "success" });
          setTimeout(() => router.push("/dashboard/connect-shopify"), 2000);
        } else {
          setState({
            status: "error",
            message: data.error ?? "Verification failed.",
            expired: data.code === "TOKEN_EXPIRED",
          });
        }
      })
      .catch(() =>
        setState({ status: "error", message: "Something went wrong. Please try again." })
      );
  }, [token, router]);

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

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20 bg-[#0A0A0B]">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
            <span className="font-black text-white text-xs" />
          </span>
          <span className="font-bold text-white tracking-tight">inBFF</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 shadow-2xl text-center">

          {/* Verifying */}
          {state.status === "verifying" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 mx-auto mb-5">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">
                Verifying your email…
              </h1>
              <p className="text-sm text-white/50">This only takes a moment.</p>
            </>
          )}

          {/* Success */}
          {state.status === "success" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Email verified!</h1>
              <p className="text-sm text-white/50 mb-6">
                Your account is confirmed. Taking you to your dashboard…
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-white/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Redirecting…
              </div>
            </>
          )}

          {/* Error */}
          {state.status === "error" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mx-auto mb-5">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Verification failed</h1>
              <p className="text-sm text-white/50 mb-6">{state.message}</p>

              {!resendDone ? (
                <form onSubmit={handleResend} className="text-left space-y-3">
                  <p className="text-xs text-white/40 text-center mb-3">
                    Enter your email to get a fresh link
                  </p>
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-all disabled:opacity-60"
                  >
                    {resendLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Mail className="h-4 w-4" /> Resend verification email</>
                    )}
                  </button>
                </form>
              ) : (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
                  ✓ New verification email sent — check your inbox.
                </div>
              )}

              <div className="mt-5 border-t border-white/10 pt-5">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
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
