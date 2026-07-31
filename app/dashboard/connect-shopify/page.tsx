"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Store, Loader2, CheckCircle2, ExternalLink,
  Zap, ShieldCheck, Package, Link2, RefreshCw, AlertCircle,
} from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "invalid-hmac":          "Shopify authorization could not be verified. Please try again.",
  "invalid-state":         "Session state was invalid. Please try again.",
  "token-exchange-failed": "Could not get an access token from Shopify. Please retry.",
  "not-configured":        "Shopify app is not configured on this server.",
  "no-connection-id":      "Connection failed — Unified.to did not return an ID. Please retry.",
  "unified-integration-disabled": "Shopify integration is not enabled in your Unified.to workspace. Please enable it in your Unified.to dashboard and try again.",
};

function ConnectShopifyInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [loading,    setLoading]    = useState<"unified" | "native" | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState("");
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    const e = searchParams.get("error");
    if (e) setError(errorMessages[e] ?? "Something went wrong during Shopify authorization.");
  }, [searchParams]);

  // ── Unified.to (primary method) ──────────────────────────────────────────
  async function connectUnified() {
    setError(null);
    setLoading("unified");
    const res  = await fetch("/api/shopify/unified/connect", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({}),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Unified.to is not configured on this server.");
      return;
    }
    window.location.href = data.redirectUrl;
  }

  // ── Direct Shopify OAuth (fallback if SHOPIFY_API_KEY is set) ────────────
  async function connectDirect(e: React.FormEvent) {
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
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      setSuccess(true);
      setTimeout(() => { router.push("/dashboard/programs/new"); router.refresh(); }, 800);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Store connected!</h2>
        <p className="text-sm text-slate-500">Redirecting to create your first program…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl stagger">
      <Link href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connect your Shopify store</h1>
        <p className="text-sm text-slate-500 mt-1">
          Link your store so we can sync products, track orders, and calculate affiliate commissions automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Primary: Unified.to ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-7 card-shadow mb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shrink-0">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Connect via Unified.to</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              One click — no Shopify Partner app required. Works with any Shopify store.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            { icon: ShieldCheck, text: "Secure OAuth — we never see your password" },
            { icon: Package,     text: "Products synced automatically" },
            { icon: Link2,       text: "Order webhooks registered instantly" },
            { icon: RefreshCw,   text: "Re-sync anytime from your program" },
          ].map(f => (
            <div key={f.text} className="flex items-start gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 shrink-0 mt-0.5">
                <f.icon className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={connectUnified}
          disabled={!!loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:brightness-105 transition-all disabled:opacity-60"
        >
          {loading === "unified" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Shopify…</>
          ) : (
            <><ExternalLink className="h-4 w-4" /> Connect Shopify store</>
          )}
        </button>
      </div>

      {/* ── Secondary: Direct OAuth (shown only if SHOPIFY_API_KEY available) ── */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 transition-colors list-none flex items-center gap-1">
          <Store className="h-3.5 w-3.5" />
          Already have a Shopify Partner app? Connect directly
          <span className="ml-auto group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-xs text-slate-500 mb-4">
            Use this if you have <code className="bg-slate-100 rounded px-1">SHOPIFY_API_KEY</code> configured in your server environment.
          </p>
          <form onSubmit={connectDirect} className="flex gap-2">
            <div className="flex flex-1 items-stretch rounded-xl border border-slate-200 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value.trim().replace(/\.myshopify\.com$/, ""))}
                placeholder="your-store"
                className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <span className="flex items-center px-3 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 shrink-0">
                .myshopify.com
              </span>
            </div>
            <button
              type="submit"
              disabled={!!loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all disabled:opacity-60"
            >
              {loading === "native" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Connect
            </button>
          </form>
        </div>
      </details>

      {/* ── How it works after connect ────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <h3 className="text-sm font-bold text-slate-800 mb-4">What happens after connecting?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: "1", title: "Products synced",   desc: "Your Shopify catalog is imported so affiliates can see what they're promoting" },
            { n: "2", title: "Create a program",  desc: "Set your commission rate, pick eligible products, and publish to the marketplace" },
            { n: "3", title: "Creators join",     desc: "Creators browse your program, get a referral link, and start driving sales" },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white mx-auto mb-2">
                {s.n}
              </div>
              <p className="text-xs font-semibold text-slate-700 mb-1">{s.title}</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">Store already connected?</p>
        <Link href="/dashboard/programs/new"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
          Skip to create program →
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
