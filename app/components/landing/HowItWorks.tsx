"use client";
import { motion } from "framer-motion";
import { Store, Users, Link2, MousePointer, ShoppingBag, DollarSign } from "lucide-react";
import { SectionReveal } from "./SectionReveal";

const stages = [
  { icon: Store, title: "Connect store", desc: "Link your Shopify store via OAuth in under a minute." },
  { icon: Users, title: "Create program", desc: "Set a name and commission rate. We generate the invite link." },
  { icon: Link2, title: "Affiliates join", desc: "Each affiliate gets a unique referral link automatically." },
  { icon: MousePointer, title: "Clicks tracked", desc: "Every click is logged and attributed to the right affiliate." },
  { icon: ShoppingBag, title: "Order comes in", desc: "Shopify fires a webhook. We verify it and record the sale." },
  { icon: DollarSign, title: "Commission paid", desc: "Review pending commissions and pay out via Stripe Connect." },
];

export function HowItWorks() {
  return (
    <SectionReveal id="how" className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-[#3B82F6]">01 — How it works</div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Six steps. Zero manual work.</h2>
          <p className="mt-4 text-white/60">inBFF handles the full affiliate lifecycle — from store connection to commission payout — automatically.</p>
        </div>

        <div className="relative mt-14">
          <div className="pointer-events-none absolute left-0 right-0 top-8 hidden md:block">
            <motion.div
              initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }} viewport={{ once: true }}
              style={{ transformOrigin: "left" }}
              className="mx-8 h-px bg-gradient-to-r from-[#3B82F6] via-[#3B82F6]/40 to-transparent"
            />
          </div>
          <div className="relative grid gap-4 md:grid-cols-6">
            {stages.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-xl border border-white/10 bg-[#0F0F11]/60 p-5 backdrop-blur-sm transition-colors hover:border-[#3B82F6]/40">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#3B82F6] transition-colors group-hover:bg-[#3B82F6] group-hover:text-white">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">0{i + 1}</div>
                <h3 className="text-sm font-semibold tracking-tight text-white">{s.title}</h3>
                <p className="mt-2 text-xs text-white/50">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
