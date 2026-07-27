"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Store, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const inputCls =
  "flex-1 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent";

const errorMessages: Record<string, string> = {
  "invalid-hmac": "Shopify authorization could not be verified. Please try again.",
  "invalid-state": "OAuth state was invalid. Please try again.",
  "token-exchange-failed": "Could not obtain access token from Shopify. Check your API credentials.",
  "not-configured": "Shopify integration is not configured on this server.",
};

export default function ConnectShopifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read OAuth error from URL params (shown after Shopify redirects back)
  useEffect(() => {
    const e = searchParams.get("error");
    if (e) {
      setError(errorMessages[e] ?? "Something went wrong during Shopify authorization.");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/shopify/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      router.push("/dashboard/programs/new");
      router.refresh();
    }
  }

  return (
    <div className="max-w-lg stagger">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        {/* Icon + heading */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 mb-5">
          <Store className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Connect your Shopify store</h1>
        <p className="text-sm text-gray-500 mb-7 leading-relaxed">
          Enter your store name to link it. In production this launches the full Shopify OAuth
          flow. In demo mode the store is saved directly.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Store name
            </label>
            <div className="flex items-stretch rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
              <input
                type="text"
                required
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value.trim())}
                placeholder="my-store"
                className={inputCls}
              />
              <span className="flex items-center px-3.5 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 shrink-0">
                .myshopify.com
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Just the subdomain — e.g. <code className="text-gray-600">my-store</code>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                Connect store
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info callout */}
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 leading-relaxed">
        <strong>Production:</strong> this button redirects to Shopify&#39;s authorization screen.
        We request <code>read_orders</code> access and register a webhook automatically.
      </div>
    </div>
  );
}
