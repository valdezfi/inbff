import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import { Check, ArrowRight, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — inBFF",
  description: "inBFF is free to use. You only pay Stripe's standard fees when money moves between brands and creators.",
};

const brandFeatures = [
  "Connect unlimited Shopify stores",
  "Create unlimited affiliate programs",
  "Open & approval-based program types",
  "Real-time click & order tracking",
  "Custom attribution windows (1–365 days)",
  "Bulk and individual payouts via Stripe",
  "Public marketplace listing",
  "Commission analytics dashboard",
  "Idempotent payout keys (no double-pay)",
  "Webhook-verified order attribution",
];

const creatorFeatures = [
  "Browse all public programs",
  "Instant referral links on open programs",
  "Real-time click & earnings tracking",
  "Request payouts via Stripe Connect",
  "Commission history & status",
  "Multi-program dashboard",
];

export default async function PricingPage() {
  const session = await getSession();
  const navUser = session ? { id: session.userId, name: "", email: "", role: session.role } : null;

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <Nav initialUser={navUser} />

      {/* Hero */}
      <div className="pt-32 pb-16 border-b border-[#e4e8ed] text-center">
        <div className="mx-auto max-w-2xl px-6">
          <div className="inline-flex items-center gap-2 border border-[#006cd2]/20 bg-[#f0f7ff] px-3 py-1 text-xs font-medium text-[#006cd2] mb-6">
            <Zap className="h-3 w-3" /> Simple pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-5 md:text-5xl">Free to use</h1>
          <p className="text-lg text-[#6b7378] leading-relaxed max-w-xl mx-auto">
            inBFF charges nothing to run your affiliate programs. You only pay Stripe&apos;s standard
            processing fees when money moves from your account to an affiliate&apos;s bank.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">

          {/* Brand plan */}
          <div className="border-2 border-[#006cd2] bg-white p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#006cd2]">For Brands</p>
                <span className="border border-[#006cd2]/20 bg-[#f0f7ff] px-2 py-0.5 text-[11px] font-semibold text-[#006cd2]">
                  Most popular
                </span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-bold text-[#0a0a0a]">$0</span>
                <span className="text-[#6b7378] mb-1">/ month</span>
              </div>
              <p className="text-sm text-[#6b7378]">
                + Stripe Connect fees on payouts (typically ~0.25% + 25¢ per transfer)
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {brandFeatures.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#1a1a1a]">
                  <Check className="h-4 w-4 text-[#006cd2] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/signup?role=brand"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
              Start as a brand <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Creator plan */}
          <div className="border border-[#e4e8ed] bg-[#f5f7fa] p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7378] mb-4">For Creators</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-bold text-[#0a0a0a]">$0</span>
                <span className="text-[#6b7378] mb-1">/ forever</span>
              </div>
              <p className="text-sm text-[#6b7378]">Always free for creators — no hidden fees, ever.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {creatorFeatures.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#1a1a1a]">
                  <Check className="h-4 w-4 text-[#6b7378] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/signup?role=creator"
              className="w-full inline-flex items-center justify-center gap-2 border border-[#0a0a0a] bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-all">
              Start as a creator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stripe note */}
        <div className="mt-10 border border-[#e4e8ed] bg-[#f5f7fa] p-6">
          <h3 className="font-bold text-[#0a0a0a] mb-2 text-sm">About Stripe fees</h3>
          <p className="text-sm text-[#6b7378] leading-relaxed">
            When a brand pays an affiliate, the transfer goes through{" "}
            <a href="https://stripe.com/connect" target="_blank" rel="noopener noreferrer"
              className="text-[#006cd2] hover:text-[#005aac] underline">Stripe Connect</a>.
            Stripe charges a small platform fee on each payout — typically around 0.25% + $0.25 per transfer
            for US accounts. This is Stripe&apos;s fee, not inBFF&apos;s. inBFF takes nothing.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-[#e4e8ed]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-xl font-bold mb-8 text-center">Pricing questions</h2>
          <div className="space-y-6">
            {[
              { q: "Is there a transaction fee on commissions?", a: "No. inBFF does not take any percentage of commissions. The only fees are Stripe's standard Connect transfer fees when you send a payout." },
              { q: "What if I don't use Stripe?", a: "You can mark commissions as paid manually. Stripe is optional — you can manage payouts outside the platform and just use inBFF for tracking." },
              { q: "Are there limits on affiliates or programs?", a: "No limits. Run as many programs as you need, with as many affiliates as you can recruit." },
              { q: "Do creators need to pay to join programs?", a: "Never. inBFF is completely free for creators. Joining programs, getting referral links, and requesting payouts cost nothing." },
            ].map(item => (
              <div key={item.q} className="border-b border-[#e4e8ed] pb-6">
                <h3 className="font-semibold text-[#0a0a0a] mb-2">{item.q}</h3>
                <p className="text-sm text-[#6b7378] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-[#e4e8ed] bg-[#f5f7fa]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-4">No credit card. No commitment.</h2>
          <p className="text-[#6b7378] mb-8">Create your account and connect your first Shopify store in minutes.</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-[#006cd2] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
