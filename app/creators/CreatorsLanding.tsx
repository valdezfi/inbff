"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Link2,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Star,
  TrendingUp,
  Gift,
  Users,
  CheckCircle2,
  Video,
  Camera,
  MessageCircle,
} from "lucide-react";
import { Nav } from "@/app/components/landing/Nav";
import { Footer } from "@/app/components/landing/Footer";
import { CountUp } from "@/app/components/landing/CountUp";

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const whyJoin = [
  {
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Earn the rate each program offers",
    desc: "Choose programs that fit your audience. Every eligible sale you drive is tracked and paid through the program's payout process.",
  },
  {
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Join programs and share your link",
    desc: "Open programs give you a link right away; approval-based programs notify you when your application is accepted.",
  },
  {
    icon: BarChart3,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "Real-time click & order tracking",
    desc: "See exactly how many people clicked your link, how many bought, and how much you've earned — updated live, no spreadsheets.",
  },
  {
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    title: "Program-specific attribution windows",
    desc: "Each program shows its attribution window before you join, so you know how long a referral can be credited.",
  },
  {
    icon: Clock,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    title: "Automatic payouts — no chasing payments",
    desc: "Store owners pay out commissions directly through Stripe Connect. No emails, no invoices, no awkward follow-ups.",
  },
  {
    icon: Gift,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    title: "Works with any audience size",
    desc: "Whether you have 500 followers or 5 million, your referral link works the same way. There's no minimum threshold to join.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Get invited",
    desc: "A store owner shares a program invite link with you. Click it to see the commission rate and what you'll earn per sale.",
  },
  {
    step: "02",
    title: "Enter your name & email",
    desc: "Create a creator account, then join open programs instantly or apply to programs that review applicants.",
  },
  {
    step: "03",
    title: "Share your link anywhere",
    desc: "Post it on Instagram, YouTube, TikTok, your newsletter, or your website. Any platform works.",
  },
  {
    step: "04",
    title: "Followers click & buy",
    desc: "When someone buys through your link, inBFF tracks the sale and calculates your commission automatically.",
  },
  {
    step: "05",
    title: "Get paid",
    desc: "The store owner pays out through Stripe Connect once your approved earnings reach that program's threshold.",
  },
];

const testimonials = [
  {
    quote:
      "I made $340 in my first month just by mentioning one product in two posts. inBFF handled everything — I didn't touch a spreadsheet.",
    name: "Priya M.",
    handle: "@priyamakes",
    platform: "Instagram",
    icon: Camera,
    earned: "$340",
  },
  {
    quote:
      "The attribution window was clear before I joined. A customer returned later and the sale was credited correctly.",
    name: "Jordan K.",
    handle: "@jordanreviews",
    platform: "YouTube",
    icon: Video,
    earned: "$820",
  },
  {
    quote:
      "Zero setup time. I got my link, dropped it in my bio, and the commissions just started rolling in. No approval needed.",
    name: "Alex T.",
    handle: "@alextechreview",
    platform: "Twitter / X",
    icon: MessageCircle,
    earned: "$215",
  },
];

const faqs = [
  {
    q: "Do I need to create an account?",
    a: "No. You just enter your name and email on the program's invite page. Your referral link is generated instantly — no password, no dashboard to manage.",
  },
  {
    q: "How does commission work?",
    a: "Each program shows its commission rate before you join. When an eligible customer buys through your referral link, the platform calculates your earnings automatically.",
  },
  {
    q: "When do I get paid?",
    a: "Store owners review and pay out pending commissions through inBFF. Once they mark it paid, funds transfer directly to your Stripe-connected bank account.",
  },
  {
    q: "What if someone visits the store but doesn't buy immediately?",
    a: "Each program sets its own attribution window. If a customer buys within that displayed window, the sale can be credited to your referral link.",
  },
  {
    q: "Can I join multiple programs?",
    a: "Yes. Each program invite is separate and gives you a unique referral link. You can join as many as you want across different stores.",
  },
  {
    q: "Is inBFF free for creators?",
    a: "Completely free for creators. Program commission rates and payout terms are displayed before you join.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreatorsLanding() {
  return (
    <div className="bg-[#0A0A0B] text-white">
      <Nav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-screen items-center overflow-hidden pt-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/15 blur-[120px]" />
          <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col items-center gap-7 text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300"
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              Creator marketplace — Find programs that fit your audience
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl"
            >
              Get paid for every customer{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                you send their way.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-lg text-white/60"
            >
              Join inBFF as a creator. Share your unique referral link.
              Earn the <span className="font-semibold text-white">commission each program offers</span> — tracked automatically,
              paid out directly to your bank account. No spreadsheets. No chasing invoices. Just earnings.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:brightness-110"
              >
                Start earning today
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                See how it works
              </a>
            </motion.div>

            {/* Social proof stats */}
            <motion.div
              variants={fadeUp}
              className="mt-8 grid grid-cols-3 gap-8 border-t border-white/10 pt-8"
            >
              {[
                { value: "Flexible", label: "program commissions" },
                { value: "Clear", label: "attribution windows" },
                { value: "$0", label: "cost to join" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/40">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="mb-3 font-mono text-xs uppercase tracking-widest text-purple-400">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Five steps to your first payout.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/60 max-w-xl mx-auto">
              From invite link to bank account — inBFF handles all the tracking,
              attribution, and payment infrastructure.
            </motion.p>
          </motion.div>

          <div className="relative">
            {/* Connector line */}
            <div className="pointer-events-none absolute left-[28px] top-8 bottom-8 hidden w-px bg-gradient-to-b from-purple-500/60 via-blue-500/40 to-transparent md:block" />

            <div className="space-y-6">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-6 md:gap-8"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 font-mono text-sm font-bold text-purple-300">
                    {step.step}
                  </div>
                  <div className="flex-1 pt-3">
                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm text-white/55 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── EARNINGS CALCULATOR ──────────────────────────────────────────── */}
      <section className="py-24 border-y border-white/10">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid gap-12 md:grid-cols-2 items-center"
          >
            <div>
              <motion.p variants={fadeUp} className="mb-3 font-mono text-xs uppercase tracking-widest text-purple-400">
                Your potential earnings
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Small audience? Big audience?{" "}
                <span className="text-white/50">It all adds up.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-white/60">
              Every program lists its commission before you join. The more qualified sales you drive, the more you earn.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:brightness-110 transition-all"
                >
                  Start earning now <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="space-y-3">
              {[
                { sales: "10 sales/mo", avg: "$50 avg order", monthly: "$25", annual: "$300" },
                { sales: "50 sales/mo", avg: "$80 avg order", monthly: "$200", annual: "$2,400" },
                { sales: "200 sales/mo", avg: "$100 avg order", monthly: "$1,000", annual: "$12,000" },
                { sales: "500 sales/mo", avg: "$120 avg order", monthly: "$3,000", annual: "$36,000" },
              ].map((row) => (
                <div
                  key={row.sales}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{row.sales}</p>
                    <p className="text-xs text-white/40">{row.avg} order value</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{row.monthly}<span className="text-xs font-normal text-white/40">/mo</span></p>
                    <p className="text-xs text-white/40">{row.annual}/yr</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-center text-white/30 pt-1">Illustrative examples; actual rates vary by program.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── WHY JOIN ─────────────────────────────────────────────────────── */}
      <section id="why" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-16"
          >
            <motion.p variants={fadeUp} className="mb-3 font-mono text-xs uppercase tracking-widest text-purple-400">
              Why inBFF
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white md:text-5xl max-w-2xl">
              Built for creators who want results, not busywork.
            </motion.h2>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {whyJoin.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bg} mb-5`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 border-y border-white/10">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="mb-3 font-mono text-xs uppercase tracking-widest text-purple-400">
              Creator stories
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Real creators. Real earnings.
            </motion.h2>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-7"
              >
                <div>
                  <div className="flex items-center gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-xs font-bold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <t.icon className="h-3 w-3" />
                        {t.handle}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{t.earned}</p>
                    <p className="text-[11px] text-white/30">first month</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mb-14 text-center"
          >
            <motion.p variants={fadeUp} className="mb-3 font-mono text-xs uppercase tracking-widest text-purple-400">
              FAQ
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white">
              Everything creators ask.
            </motion.h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-purple-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{faq.q}</p>
                    <p className="mt-2 text-sm text-white/55 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-blue-900/40 p-10 text-center md:p-16">
              {/* Blobs */}
              <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />

              <motion.div variants={fadeUp} className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-1.5 text-xs font-medium text-purple-300 mb-6">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Discover programs built for your audience
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-white md:text-6xl mb-4">
                  Your audience is your{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    income stream.
                  </span>
                </h2>
                <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
                  Join inBFF today. Get your referral link in 30 seconds and start
                  earning through the programs you choose — completely free for creators.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition-all hover:brightness-110"
                  >
                    Start earning — it&apos;s free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <Users className="h-4 w-4" />
                    I&apos;m a store owner
                  </Link>
                </div>
                <p className="mt-6 text-xs text-white/30">
                  Free for creators · Program terms are shown before you join · Powered by inBFF
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
