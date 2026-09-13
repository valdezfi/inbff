import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import {
  Store, Users, MousePointer, CreditCard, BarChart3,
  ShoppingBag, Zap, Shield, Globe, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Platform — inBFF",
  description: "Everything you need to run a Shopify affiliate program — store connection, program creation, tracking, and automated payouts.",
};

const features = [
  {
    icon: Store,
    title: "Shopify integration",
    desc: "Connect any Shopify store in one click via OAuth. Products sync automatically — no manual setup.",
    color: "bg-[#e8f2fb] text-[#006cd2]",
  },
  {
    icon: Users,
    title: "Affiliate management",
    desc: "Open programs let anyone join instantly. Approval-based programs let you review every affiliate before they promote.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: MousePointer,
    title: "Click & attribution tracking",
    desc: "Every referral click is logged with IP, user agent, and timestamp. Orders attributed within your custom window.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: CreditCard,
    title: "Stripe Connect payouts",
    desc: "Affiliates connect their bank via Stripe Express. You trigger payouts in one click — funds move automatically.",
    color: "bg-[#e8f2fb] text-[#006cd2]",
  },
  {
    icon: BarChart3,
    title: "Real-time dashboard",
    desc: "See clicks, orders, commissions, and payouts across every program in a single overview.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Globe,
    title: "Public marketplace",
    desc: "Every active program is listed on the inBFF marketplace so creators can discover and apply without a direct invite.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: ShoppingBag,
    title: "Order webhook processing",
    desc: "Shopify order webhooks are verified and processed in real time. Commissions created automatically on every qualifying order.",
    color: "bg-[#e8f2fb] text-[#006cd2]",
  },
  {
    icon: Shield,
    title: "Fraud protection",
    desc: "Attribution window enforcement, HMAC webhook verification, and idempotent payout keys prevent double-payments and abuse.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Zap,
    title: "Instant referral links",
    desc: "Affiliates get a unique referral link the moment they join. No email confirmation, no waiting.",
    color: "bg-amber-50 text-amber-600",
  },
];

export default async function PlatformPage() {
  const session = await getSession();
  const navUser = session ? { id: session.userId, name: "", email: "", role: session.role } : null;

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <Nav initialUser={navUser} />

      {/* Hero */}
      <div className="pt-32 pb-20 border-b border-[#e4e8ed]">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 border border-[#006cd2]/20 bg-[#f0f7ff] px-3 py-1 text-xs font-medium text-[#006cd2] mb-6">
            <Zap className="h-3 w-3" /> The Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-5 md:text-5xl">
            Everything you need to run<br />
            <span className="text-[#006cd2]">affiliate programs at scale</span>
          </h1>
          <p className="text-lg text-[#6b7378] max-w-2xl mx-auto leading-relaxed mb-8">
            inBFF connects your Shopify store, manages your affiliates, tracks every click and order,
            and handles payouts — all without writing a single line of code.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-[#006cd2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/marketplace"
              className="inline-flex items-center gap-2 border border-[#e4e8ed] bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] hover:border-[#006cd2] hover:text-[#006cd2] transition-all">
              Browse programs
            </Link>
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl font-bold tracking-tight mb-3">Built for Shopify brands and creators</h2>
          <p className="text-[#6b7378] max-w-xl mx-auto">
            Every feature is designed around the real-world affiliate workflow — from store connection to final payout.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="border border-[#e4e8ed] bg-white p-6 hover:border-[#006cd2]/40 transition-colors">
              <div className={`inline-flex h-10 w-10 items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#0a0a0a] mb-2">{f.title}</h3>
              <p className="text-sm text-[#6b7378] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-[#e4e8ed] bg-[#f5f7fa]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Ready to launch your affiliate program?</h2>
          <p className="text-[#6b7378] mb-8">Connect your Shopify store and go live in under 2 minutes.</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 bg-[#006cd2] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
            Create your free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
