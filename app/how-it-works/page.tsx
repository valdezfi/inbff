import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import { ArrowRight, Store, Users, MousePointer, ShoppingBag, CreditCard, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "How it works — inBFF",
  description: "Learn how inBFF lets Shopify brands launch affiliate programs and creators earn commissions — step by step.",
};

const brandSteps = [
  { n: "01", icon: Store,       title: "Connect your Shopify store",    desc: "One-click OAuth connection via our Unified integration. Products sync automatically in the background." },
  { n: "02", icon: Users,       title: "Create an affiliate program",   desc: "Set your commission rate, choose eligible products, and pick open or approval-based membership." },
  { n: "03", icon: Sparkles,    title: "Publish to the marketplace",    desc: "Your program goes live on the inBFF marketplace. Creators browse, apply, and get their unique referral links." },
  { n: "04", icon: ShoppingBag, title: "Orders tracked automatically",  desc: "Every order from a referral link is attributed within your custom cookie window. Commissions created in real time." },
  { n: "05", icon: CreditCard,  title: "Pay affiliates in one click",   desc: "Trigger individual or bulk payouts. Funds transfer directly to affiliates via Stripe Connect — no invoicing needed." },
];

const creatorSteps = [
  { n: "01", icon: Users,       title: "Browse the marketplace",        desc: "Discover Shopify brands offering affiliate programs. Filter by category, commission rate, or program type." },
  { n: "02", icon: Sparkles,    title: "Join a program",                desc: "Open programs give you a referral link instantly. Approval programs notify the brand — you hear back by email." },
  { n: "03", icon: MousePointer,title: "Share your referral link",      desc: "Post it on Instagram, YouTube, your newsletter, or anywhere your audience is. Every click is tracked." },
  { n: "04", icon: ShoppingBag, title: "Earn on every sale",            desc: "When someone buys within the attribution window after clicking your link, you earn the commission automatically." },
  { n: "05", icon: CreditCard,  title: "Request your payout",           desc: "Once you hit the minimum threshold, connect Stripe and request a payout. Funds arrive directly in your bank." },
];

export default async function HowItWorksPage() {
  const session = await getSession();
  const navUser = session ? { id: session.userId, name: "", email: "", role: session.role } : null;

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <Nav initialUser={navUser} />

      {/* Hero */}
      <div className="pt-32 pb-16 border-b border-[#e4e8ed]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-5 md:text-5xl">How inBFF works</h1>
          <p className="text-lg text-[#6b7378] leading-relaxed">
            Two flows, one platform. Brands launch programs and pay creators. Creators find programs and earn commissions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-2">

          {/* For Brands */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-9 w-9 items-center justify-center bg-[#006cd2]">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7378]">For Brands</p>
                <h2 className="text-xl font-bold text-[#0a0a0a]">Launch your affiliate program</h2>
              </div>
            </div>

            <div className="space-y-0">
              {brandSteps.map((s, i) => (
                <div key={s.n} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#006cd2] text-white text-sm font-bold">
                      {s.n}
                    </div>
                    {i < brandSteps.length - 1 && <div className="w-0.5 flex-1 bg-[#e4e8ed] my-1" />}
                  </div>
                  <div className="pb-8">
                    <div className="flex items-center gap-2 mb-1.5">
                      <s.icon className="h-4 w-4 text-[#006cd2]" />
                      <h3 className="font-bold text-[#0a0a0a] text-sm">{s.title}</h3>
                    </div>
                    <p className="text-sm text-[#6b7378] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signup?role=brand"
              className="inline-flex items-center gap-2 bg-[#006cd2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
              Start as a brand <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* For Creators */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-9 w-9 items-center justify-center bg-[#0a0a0a]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7378]">For Creators</p>
                <h2 className="text-xl font-bold text-[#0a0a0a]">Find programs and earn</h2>
              </div>
            </div>

            <div className="space-y-0">
              {creatorSteps.map((s, i) => (
                <div key={s.n} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#0a0a0a] text-white text-sm font-bold">
                      {s.n}
                    </div>
                    {i < creatorSteps.length - 1 && <div className="w-0.5 flex-1 bg-[#e4e8ed] my-1" />}
                  </div>
                  <div className="pb-8">
                    <div className="flex items-center gap-2 mb-1.5">
                      <s.icon className="h-4 w-4 text-[#6b7378]" />
                      <h3 className="font-bold text-[#0a0a0a] text-sm">{s.title}</h3>
                    </div>
                    <p className="text-sm text-[#6b7378] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signup?role=creator"
              className="inline-flex items-center gap-2 border border-[#0a0a0a] bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-all">
              Start as a creator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ strip */}
      <div className="border-t border-[#e4e8ed] bg-[#f5f7fa]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-xl font-bold mb-8 text-center">Common questions</h2>
          <div className="space-y-6">
            {[
              { q: "Do I need a Shopify Partner account?", a: "No. inBFF uses Unified.to to connect your Shopify store without a Partner app. Just click 'Connect store', authorize on Shopify, and you're done." },
              { q: "How does attribution work?", a: "When someone clicks a referral link, we log the click. If they place an order within your attribution window (default 30 days), the commission is automatically created for that affiliate." },
              { q: "When do affiliates get paid?", a: "You control the payout timing. Affiliates can request payouts once they hit the minimum threshold you set. Funds move via Stripe Connect directly to their bank." },
              { q: "Is inBFF free?", a: "The platform is free to use. You only pay Stripe's standard fees when money moves." },
            ].map(item => (
              <div key={item.q} className="border-b border-[#e4e8ed] pb-6">
                <h3 className="font-semibold text-[#0a0a0a] mb-2">{item.q}</h3>
                <p className="text-sm text-[#6b7378] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
