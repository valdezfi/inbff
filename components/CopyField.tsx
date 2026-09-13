"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({ value, dark = false }: { value: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className={`flex-1 min-w-0 truncate border px-3.5 py-2.5 text-sm font-mono tracking-tight ${
        dark
          ? "border-[#e4e8ed]/20 bg-white/5 text-white/80"
          : "border-[#e4e8ed] bg-[#f5f7fa] text-[#1a1a1a]"
      }`}>
        {value}
      </code>
      <button type="button" onClick={copy}
        className={`shrink-0 inline-flex items-center gap-1.5 border px-3.5 py-2.5 text-xs font-semibold transition-all ${
          copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : dark
              ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              : "border-[#e4e8ed] bg-white text-[#6b7378] hover:border-[#006cd2] hover:text-[#006cd2]"
        }`}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
