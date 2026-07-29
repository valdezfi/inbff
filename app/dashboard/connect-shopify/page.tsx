"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Store, ArrowRight, Loader2, AlertCircle,
  CheckCircle2, ShieldCheck, Zap, ExternalLink, ChevronRight,
} from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "invalid-hmac":          "Shopify authorization could not be verified. Please try again.",
  "invalid-state":         "OAuth state was invalid. Please try again.",
  "token-exchange-failed": "Could not obtain an access token from Shopify. Check your API credentials.",
  "not-configured":        "Shopify integration is not configured on this server.",
  "no-connection-id":      "Unified.to did not return a connection ID. Please try again.",
};

function ConnectShopifyInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [shopDomain, setShopDomain]   = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState<"native" | "unified" | null>(null);
  const [success, setSuccess]         = useState(false);

  const hasNativeShopify = !!process.env.NEXT_PUBLIC_APP_URL; // always true; actual check is server-side
  const hasUnified       = typeof window !== "undefined"; // show unified option always — server checks env

  useEffect(() => {
    const e = searchParams.get("error");
    if (e) setError(errorMessages[e] ?? "Something went wrong during Shopify authorization.");
  }, [searchParams]);

  // ── Native Shopify OAuth ──────────────────────────────────────────────────
  async function connectNative(e: React.FormEvent) {
    e.preventDefault();
    if (!shopDomain.trim()) { setError("Enter your store name."); return; }
    setError(null);
    setLoading("native");

    const res  = await fetch("/api/shopify/connect", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shopDomain: shopDomain.trim() }),
    });
    const data = await res.json();
    setLoading(null);

    if (!res.ok) { setError(data.error || "Something went wrong."); return; }

    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;   // full Shopify OAuth redirect
    } else {
      setSuccess(true);
      setTimeout(() => { router.push("/dashboard/programs/new"); router.refresh(); }, 800);
    }
  }

  // ── Unified.to OAuth ─────────────────────────────────────────────────────
  async function connectUnified() {
    setError(null);
    setLoading("unified");

    const res  = await fetch("/api/shopify/unified/connect", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shopDomain: shopDomain.trim() || undefined }),
    });
    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setError(data.error || "Unified.to is not configured on this server.");
      return;
    }
    window.location.href = data.redirectUrl;
  }

  if (success) {
    return (
      <div className="max-w-lg flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Store connected!</h2>
        <p className="text-sm text-slate-500">Redirecting to program setup…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl stagger">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connect your Shopify store</h1>
        <p className="text-sm text-slate-500 mt-1">
          Any business or brand can connect their Shopify store here. Affiliates will then be able
          to promote your products and earn commissions automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">

        {/* ── Option 1: Native Shopify OAuth ────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Direct Shopify OAuth</h2>
              <p className="text-xs text-slate-400">Recommended for production</p>
            </div>
          </div>

          <ul className="space-y-2 mb-5 flex-1">
            {[
              "Full order webhook integration",
              "Automatic product sync",
              "Per-store webhook secrets",
              "No third-party dependency",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <form onSubmit={connectNative} className="space-y-3">
            <div className="flex items-stretch rounded-xl border border-slate-200 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white">
              <input
                type="text"
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value.trim().replace(/\.myshopify\.com$/, ""))}
                placeholder="your-store"
                className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              <span className="flex items-center px-3 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 shrink-0">
                .myshopify.com
              </span>
            </div>
            <button
              type="submit"
              disabled={!!loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 transition-all disabled:opacity-60"
            >
              {loading === "native" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Connect with Shopify</>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Requires <code className="bg-slate-100 rounded px-1">SHOPIFY_API_KEY</code> in env.
            In dev mode the store is saved directly.
          </p>
        </div>

        {/* ── Option 2: Unified.to ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Connect via Unified.to</h2>
              <p className="text-xs text-slate-400">Zero Shopify app setup needed</p>
            </div>
          </div>

          <ul className="space-y-2 mb-5 flex-1">
            {[
              "No Shopify Partner app required",
              "Works with any Shopify plan",
              "Products synced automatically",
              "One-click brand onboarding",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={connectUnified}
            disabled={!!loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 transition-all disabled:opacity-60"
          >
            {loading === "unified" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> Connect via Unified.to</>
            )}
          </button>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Requires <code className="bg-slate-100 rounded px-1">NEXT_PUBLIC_UNIFIED_WORKSPACE_ID</code> in env.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <h3 className="text-sm font-bold text-slate-800 mb-4">How it works for your brand</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { n: "1", label: "Connect",    desc: "Link your Shopify store via OAuth" },
            { n: "2", label: "Create",     desc: "Set up an affiliate program with your commission rate" },
            { n: "3", label: "Share",      desc: "Affiliates join and get unique referral links" },
            { n: "4", label: "Earn",       desc: "We track clicks, attribute orders, and calculate commissions" },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white mx-auto mb-2">
                {s.n}
              </div>
              <p className="text-xs font-semibold text-slate-700">{s.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">Already have a store connected?</p>
        <Link
          href="/dashboard/programs/new"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Skip to program setup <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ConnectShopifyPage() {
  return (
    <Suspense>
      <ConnectShopifyInner />
    </Suspense>
  );
}
