/**
 * Demo storefront — only used during local development when there's no real
 * Shopify store to redirect to.  In production, /r/:code redirects directly
 * to the real Shopify store (https://{shopDomain}?ref=CODE).
 *
 * This page is intentionally kept for testing the end-to-end flow locally
 * without needing a live Shopify store.
 */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PurchaseForm from "./PurchaseForm";

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ shopDomain: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { shopDomain } = await params;
  const { ref } = await searchParams;

  const store = await db.findStoreByDomain(shopDomain);
  if (!store) notFound();

  const affiliate = ref ? await db.findAffiliateByCode(ref) : null;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-4 text-center">
          {shopDomain}
        </p>
        <div className="rounded-xl border border-black/10 p-6">
          {affiliate && (
            <p className="text-sm text-foreground/60 mb-4 text-center">
              You were referred by{" "}
              <span className="font-medium text-foreground">{affiliate.name}</span>
            </p>
          )}
          <PurchaseForm shopDomain={shopDomain} referralCode={ref ?? null} />
        </div>
        <p className="text-xs text-foreground/40 text-center mt-4">
          This is a local test storefront. In production, your referral link points
          directly to your real Shopify store.
        </p>
      </div>
    </main>
  );
}
