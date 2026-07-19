"use client";
import { useState } from "react";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 truncate rounded-lg border border-black/10 bg-black/[.03] px-3 py-2 text-sm">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium hover:bg-black/[.03] transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
