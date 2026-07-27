"use client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { CountUp } from "./CountUp";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero() {
  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-grain pt-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-16 md:py-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex flex-col items-start gap-7"
        >
          <motion.a
            variants={item}
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur-sm transition-colors hover:text-white"
          >
            <Sparkles className="h-3 w-3 text-[#3B82F6]" />
            Shopify affiliate programs, fully automated
            <ArrowRight className="h-3 w-3" />
          </motion.a>

          <motion.h1
            variants={item}
            className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl"
          >
            Turn your Shopify store into an{" "}
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
              affiliate engine.
            </span>
          </motion.h1>

          <motion.p variants={item} className="max-w-xl text-lg text-white/60">
            Connect your store, set a commission rate, and let creators bring you
            customers. We track every click, attribute every order, and calculate
            every payout — automatically.
          </motion.p>

          <motion.div
            variants={item}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/25 transition-all hover:bg-[#2563eb]"
            >
              Connect your store
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/creators"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              I&apos;m a creator →
            </Link>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 grid w-full grid-cols-2 gap-6 border-t border-white/10 pt-8 md:grid-cols-4"
          >
            <Stat value={<CountUp end={2} suffix=" min" />} label="setup time" />
            <Stat value={<CountUp end={100} suffix="%" />} label="automated tracking" />
            <Stat value={<CountUp end={5} suffix="%" />} label="creator rev share" />
            <Stat value={<><CountUp end={0} />% fees</>} label="on commissions" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-2xl font-bold tracking-tight text-white md:text-3xl">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
