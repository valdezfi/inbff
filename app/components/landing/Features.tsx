import { Zap, Shield, BarChart2, ArrowUpRight } from "lucide-react";
import { SectionReveal } from "./SectionReveal";

const cards = [
  {
    icon: Zap,
    tag: "For store owners",
    title: "Zero-config tracking",
    desc: "Connect once via OAuth. We register the Shopify webhook and start attributing orders immediately.",
    bullets: ["Automatic webhook registration", "HMAC-verified order events", "No storefront code required"],
    cta: "Connect your store",
    href: "/signup",
  },
  {
    icon: BarChart2,
    tag: "For affiliates",
    title: "Real-time dashboard",
    desc: "Affiliates get a unique link and can see their clicks, orders, and earned commissions at a glance.",
    bullets: ["Unique referral code per affiliate", "Click & conversion tracking", "Commission history"],
    cta: "Join a program",
    href: "#",
  },
  {
    icon: Shield,
    tag: "For payouts",
    title: "Stripe Connect payouts",
    desc: "Pay affiliates directly to their bank account via Stripe Connect transfers. No manual wire transfers.",
    bullets: ["One-click commission payouts", "Stripe Transfer API", "Full audit trail"],
    cta: "Learn about payouts",
    href: "#pricing",
  },
];

export function Features() {
  return (
    <SectionReveal id="features" className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-[#3B82F6]">02 — Features</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Everything you need. Nothing you don&apos;t.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <a key={c.title} href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F11]/60 p-7 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-[#3B82F6]/50 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.4),0_20px_60px_-20px_rgba(59,130,246,0.4)]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#3B82F6]">
                  <c.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#3B82F6]" />
              </div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white/40">{c.tag}</div>
              <h3 className="text-xl font-semibold tracking-tight text-white">{c.title}</h3>
              <p className="mt-3 text-sm text-white/60">{c.desc}</p>
              <ul className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
                {c.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-white/50">
                    <span className="mt-2 h-1 w-1 rounded-full bg-[#3B82F6]" />{b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#3B82F6]">
                {c.cta}<ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}
