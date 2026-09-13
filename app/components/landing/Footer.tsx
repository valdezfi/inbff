import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Dashboard",  href: "/dashboard" },
      { label: "Programs",   href: "/dashboard/programs" },
      { label: "Payouts",    href: "/dashboard/payouts" },
      { label: "Marketplace",href: "/marketplace" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",   href: "#" },
      { label: "Blog",    href: "#" },
      { label: "Contact", href: "mailto:hello@referly.app" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms",   href: "#" },
    ],
  },
];

function LogoMark() {
  return (
    <svg viewBox="0 0 42 34" aria-hidden="true" style={{ width: 22, fill: "#006cd2" }}>
      <polygon points="12,0 30,0 33.2,3.2 15.2,3.2" />
      <polygon points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
      <polygon points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
      <polygon points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
      <polygon points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
      <polygon points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#e4e8ed] bg-white"
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base text-[#0a0a0a]">
            <LogoMark />
            Referly
          </Link>
          <p className="mt-4 text-sm text-[#6b7378] leading-relaxed">
            Shopify affiliate programs, fully automated. Track clicks, attribute orders, pay creators — all in one place.
          </p>
        </div>

        {cols.map(col => (
          <div key={col.title}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#6b7378]">{col.title}</div>
            <ul className="space-y-2.5">
              {col.links.map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-[#6b7378] transition-colors hover:text-[#006cd2]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#e4e8ed]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="text-xs text-[#6b7378]">© {new Date().getFullYear()} Referly. All rights reserved.</div>
          <div className="text-xs text-[#6b7378]">Built for Shopify store owners & creators.</div>
        </div>
      </div>
    </footer>
  );
}
