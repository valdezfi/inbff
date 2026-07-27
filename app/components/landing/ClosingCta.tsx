import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SectionReveal } from "./SectionReveal";

export function ClosingCta() {
  return (
    <SectionReveal id="cta" className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0F0F11]/60 p-10 backdrop-blur-sm md:p-16">
          <div className="absolute inset-0 -z-10 bg-grain opacity-70" />
          {/* Glow blob */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#3B82F6]/20 blur-3xl" />
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Ready to run your first program?
            </h2>
            <p className="mt-4 text-lg text-white/60">
              It takes about two minutes to set up. No credit card required.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 transition-all hover:bg-[#2563eb]"
              >
                Connect your store
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/creators"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                I&apos;m a creator →
              </Link>
            </div>
            <div className="mt-6 font-mono text-xs text-white/30">
              No credit card required · 2 minute setup · Growth plan $10/mo
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
