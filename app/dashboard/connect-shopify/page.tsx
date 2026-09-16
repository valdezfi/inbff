"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, CheckCircle2, ExternalLink,
  Zap, ShieldCheck, Package, Link2, RefreshCw, AlertCircle,
} from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "invalid-state":                 "Session expired. Please try again.",
  "no-connection-id":              "Connection failed — please retry.",
  "unified-integration-disabled":  "Shopify integration is not enabled in your Unified.to workspace. Enable it in your Unified.to dashboard and try again.",
};

function ConnectShopifyInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState("");

  useEffect(() => {
    const e = searchParams.get("error");
    if (e) setError(errorMessages[e] ?? "Something went wrong during Shopify authorization.");
  }, [searchParams]);

  async function connectShopify() {
    setError(null);
    const normalizedDomain = shopDomain.trim().replace(/^https?:\/\//, "").replace(/\.myshopify\.com\/?$/, "").replace(/\/$/, "");
    if (!normalizedDomain) {
      setError("Enter your Shopify store name to continue.");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/shopify/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shopDomain: normalizedDomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start Shopify connection. Check your configuration.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl stagger">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Connect your Shopify store</h1>
        <p className="text-sm text-slate-500 mt-1">
          Link your store so we can sync products, track orders, and calculate commissions automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main connect card */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-7 card-shadow">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shrink-0">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Connect via Shopify OAuth</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Secure one-click connection. Works with any Shopify store.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
          {[
            { icon: ShieldCheck, text: "Secure OAuth — we never see your password" },
            { icon: Package,     text: "Products synced automatically after connect" },
            { icon: Link2,       text: "Orders tracked for affiliate attribution" },
            { icon: RefreshCw,   text: "Re-sync products anytime from your program" },
          ].map(f => (
            <div key={f.text} className="flex items-start gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 shrink-0 mt-0.5">
                <f.icon className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>

        <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="shop-domain">
          Shopify store name
        </label>
        <div className="flex items-center rounded-xl border border-indigo-200 bg-white overflow-hidden mb-5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
          <input
            id="shop-domain"
            type="text"
            value={shopDomain}
            onChange={(event) => setShopDomain(event.target.value)}
            placeholder="your-store"
            autoComplete="off"
            className="min-w-0 flex-1 px-4 py-3 text-sm text-slate-900 outline-none"
            aria-describedby="shop-domain-help"
          />
          <span className="pr-4 text-sm text-slate-500 whitespace-nowrap">.myshopify.com</span>
        </div>
        <p id="shop-domain-help" className="text-xs text-slate-500 -mt-3 mb-5">
          Enter the name before <span className="font-medium">.myshopify.com</span>.
        </p>

        <button
          onClick={connectShopify}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:brightness-105 transition-all disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Shopify…</>
          ) : (
            <><ExternalLink className="h-4 w-4" /> Connect Shopify store</>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <h3 className="text-sm font-bold text-slate-800 mb-4">What happens after connecting?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: "1", title: "Products synced",  desc: "Your Shopify catalog is imported so affiliates can see what they're promoting" },
            { n: "2", title: "Create a program", desc: "Set your commission rate, pick products, and publish to the marketplace" },
            { n: "3", title: "Creators join",    desc: "Creators browse your program, get a referral link, and start driving sales" },
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
        <Link
          href="/dashboard/programs/new"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
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
