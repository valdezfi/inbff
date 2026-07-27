import { Check, Zap, Users } from "lucide-react";
import Link from "next/link";
import { SectionReveal } from "./SectionReveal";

const tiers = [
  {
    name: "Starter",
    originalPrice: null,
    price: "$0",
    period: "forever",
    desc: "For stores just getting started with affiliates.",
    features: [
      "Up to 5 affiliates",
      "1 affiliate program",
      "Basic click tracking",
      "Manual payouts",
    ],
    cta: "Get started free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Growth",
    originalPrice: "$50",
    price: "$10",
    period: "/ mo",
    desc: "For stores ready to scale their affiliate channel.",
    features: [
      "Unlimited affiliates",
      "Unlimited programs",
      "Real-time analytics",
      "Stripe Connect payouts",
      "Creator rev share (5%)",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Enterprise",
    originalPrice: null,
    price: "Custom",
    period: "",
    desc: "For high-volume stores with custom requirements.",
    features: [
      "Everything in Growth",
      "Custom commission rules",
      "Dedicated onboarding",
      "SLA guarantee",
      "24/7 support",
    ],
    cta: "Talk to us",
    href: "mailto:hello@inbff.app",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <SectionReveal id="pricing" className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-[#3B82F6]">
            03 — Pricing
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-white/60">
            No percentage cut on commissions. You keep everything your affiliates earn you.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-7 backdrop-blur-sm ${
                t.highlight
                  ? "border-[#3B82F6]/50 bg-[#0F0F11] shadow-[0_0_60px_-20px_rgba(59,130,246,0.6)]"
                  : "border-white/10 bg-[#0F0F11]/60"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#3B82F6] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white shadow-lg shadow-[#3B82F6]/30">
                  🔥 80% off — limited time
                </span>
              )}

              <div className="text-sm font-medium uppercase tracking-widest text-white/40">
                {t.name}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {t.price}
                </span>
                {t.period && (
                  <span className="text-sm text-white/40">{t.period}</span>
                )}
                {t.originalPrice && (
                  <span className="ml-1 text-sm font-medium text-white/30 line-through">
                    {t.originalPrice}
                  </span>
                )}
              </div>

              {t.highlight && (
                <p className="mt-1 text-xs text-emerald-400 font-medium">
                  Save $40/mo — was {t.originalPrice}
                </p>
              )}

              <p className="mt-2 text-sm text-white/60">{t.desc}</p>

              <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-6 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={t.href}
                className={`mt-7 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  t.highlight
                    ? "bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563eb]"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Creator rev share callout */}
        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
            <Users className="h-4 w-4 text-purple-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              5% creator revenue share included in Growth
            </p>
            <p className="mt-0.5 text-sm text-white/50">
              Creators who drive sales through inBFF automatically earn 5% of every
              transaction — paid out directly, no manual tracking needed.{" "}
              <Link href="/creators" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Learn more →
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-5 text-sm">
          <Zap className="h-4 w-4 shrink-0 text-[#3B82F6]" />
          <span>
            <span className="font-medium text-white">
              Shopify App Store coming soon —
            </span>{" "}
            <span className="text-white/60">
              install directly from your Shopify admin. No separate account needed.
            </span>
          </span>
        </div>
      </div>
    </SectionReveal>
  );
}
