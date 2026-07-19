"use client";
import { useState } from "react";

export default function ConnectShopifyPage() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Map OAuth callback error codes to human-readable messages
  const errorMessages: Record<string, string> = {
    "invalid-hmac": "The Shopify authorization could not be verified. Please try again.",
    "invalid-state": "The OAuth state was invalid. Please try again.",
    "token-exchange-failed": "Could not obtain access token from Shopify. Check your API credentials.",
    "not-configured": "Shopify integration is not configured on this server.",
  };

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError && !error) {
      setError(errorMessages[oauthError] ?? "Something went wrong during Shopify authorization.");
    }
  }

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

    // Redirect to Shopify's authorization screen
    window.location.href = data.redirectUrl;
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold mb-1">Connect your Shopify store</h1>
      <p className="text-foreground/60 text-sm mb-8">
        Enter your store name to begin the Shopify OAuth flow. You&apos;ll be redirected to
        Shopify to authorize access, then brought straight back here.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Store name</label>
          <div className="flex items-stretch rounded-lg border border-black/15 overflow-hidden focus-within:ring-2 focus-within:ring-accent/40">
            <input
              type="text"
              required
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value.trim())}
              placeholder="my-store"
              className="flex-1 px-3 py-2.5 focus:outline-none"
            />
            <span className="px-3 py-2.5 text-foreground/40 text-sm bg-black/[.03]">
              .myshopify.com
            </span>
          </div>
          <p className="text-xs text-foreground/50 mt-1.5">
            Just the name — e.g. <code>my-store</code>, not the full URL.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Redirecting to Shopify…" : "Connect store"}
        </button>
      </form>
    </div>
  );
}
