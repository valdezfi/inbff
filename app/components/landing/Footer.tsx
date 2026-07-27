import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Programs", href: "/dashboard/programs" },
      { label: "Payouts", href: "/dashboard/payouts" },
      { label: "For Creators", href: "/creators" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: "#" },
      { label: "Shopify Setup", href: "#" },
      { label: "Stripe Connect", href: "#" },
      { label: "GitHub", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "mailto:hello@inbff.app" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6] shadow-[0_0_16px_rgba(59,130,246,0.4)]">
              <span className="font-black text-white text-xs">iB</span>
            </span>
            inBFF
          </Link>
          <p className="mt-4 text-sm text-white/50">
            Shopify affiliate programs, fully automated. Track clicks, attribute
            orders, pay creators — all in one place.
          </p>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-white/30">
              {col.title}
            </div>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/60 transition-colors hover:text-[#3B82F6]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="font-mono text-xs text-white/30">
            © {new Date().getFullYear()} inBFF. All rights reserved.
          </div>
          <div className="font-mono text-xs text-white/20">
            Built for Shopify store owners & creators.
          </div>
        </div>
      </div>
    </footer>
  );
}
