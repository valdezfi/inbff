"use client";
/**
 * Local test purchase form.
 *
 * In development (no SHOPIFY_WEBHOOK_SECRET set), this form calls a special
 * test endpoint that bypasses HMAC verification so you can test the
 * attribution flow without a real Shopify store.
 *
 * In production this page is never reached — the referral link goes straight
 * to the real Shopify storefront.
 */
import { useState } from "react";

export default function PurchaseForm({
  shopDomain,
  referralCode,
}: {
  shopDomain: string;
  referralCode: string | null;
}) {
  const [amount, setAmount] = useState(48);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="text-center">
        <p className="font-medium mb-1">Order placed 🎉</p>
        <p className="text-sm text-foreground/60">
          {referralCode
            ? "This purchase was attributed to the referring affiliate — check the store owner's dashboard for the pending commission."
            : "No referral was attached to this visit."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await fetch("/api/webhooks/orders/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopDomain,
            shopifyOrderId: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
            amount,
            currency: "USD",
            referralCode,
          }),
        });
        setLoading(false);
        if (res.ok) {
          setDone(true);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Something went wrong.");
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs text-foreground/50 mb-1.5">Order amount</label>
        <div className="flex items-center rounded-lg border border-black/15 overflow-hidden">
          <span className="pl-3 text-foreground/40">$</span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 px-2 py-2.5 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
      >
        {loading ? "Placing order…" : "Simulate purchase"}
      </button>
      <p className="text-xs text-foreground/40 text-center">
        Simulates Shopify sending an orders/create webhook. Dev only.
      </p>
    </form>
  );
}
