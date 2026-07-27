"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({
  value,
  dark = false,
}: {
  value: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (dark) {
    return (
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 truncate rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/80 font-mono">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
            copied
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 font-mono tracking-tight">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
          copied
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 card-shadow"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
