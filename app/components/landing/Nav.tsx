"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

const links = [
  { label: "Platform",     href: "/platform" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Marketplace",  href: "/marketplace" },
  { label: "Pricing",      href: "/pricing" },
];

interface MeUser { id: string; name: string; email: string; role: string; }

function initials(name: string) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 42 34" aria-hidden="true" style={{ width: size, fill: "#006cd2", flexShrink: 0 }}>
      <polygon points="12,0 30,0 33.2,3.2 15.2,3.2" />
      <polygon points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
      <polygon points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
      <polygon points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
      <polygon points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
      <polygon points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
    </svg>
  );
}

export function Nav({ initialUser }: { initialUser?: MeUser | null }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(initialUser ?? null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async res => {
      if (res.status === 401) return;
      const data = await res.json();
      if (!cancelled && data.user) setUser(data.user);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const dashboardHref = user?.role === "brand" ? "/dashboard" : "/affiliate/dashboard";

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled ? "border-b border-[#e4e8ed] bg-white/90 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
    }`}
      style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight text-[#0a0a0a]">
          <LogoMark size={22} />
          inBFF
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(l =>
            l.href.startsWith("/") ? (
              <Link key={l.label} href={l.href} className="text-sm text-[#6b7378] transition-colors hover:text-[#006cd2] font-medium">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="text-sm text-[#6b7378] transition-colors hover:text-[#006cd2] font-medium">
                {l.label}
              </a>
            )
          )}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link href={dashboardHref}
                className="flex items-center gap-2 border border-[#e4e8ed] px-3 py-1.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:border-[#006cd2] hover:text-[#006cd2]">
                <span className="flex h-5 w-5 items-center justify-center bg-[#006cd2] text-[10px] font-bold text-white">
                  {initials(user.name)}
                </span>
                Dashboard
              </Link>
              <button onClick={handleLogout}
                className="inline-flex items-center gap-1.5 border border-[#e4e8ed] px-4 py-2 text-sm font-medium text-[#6b7378] hover:border-red-300 hover:text-red-600 transition-all">
                <LogOut className="h-3.5 w-3.5" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#6b7378] transition-colors hover:text-[#006cd2] font-medium">
                Sign in
              </Link>
              <Link href="/signup"
                className="inline-flex items-center bg-[#006cd2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005aac] transition-all">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button className="md:hidden text-[#0a0a0a]" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#e4e8ed] bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {links.map(l =>
              l.href.startsWith("/") ? (
                <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-[#6b7378] hover:bg-[#f0f7ff] hover:text-[#006cd2]">
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-[#6b7378] hover:bg-[#f0f7ff] hover:text-[#006cd2]">
                  {l.label}
                </a>
              )
            )}
            <div className="mt-3 flex flex-col gap-2 border-t border-[#e4e8ed] pt-3">
              {user ? (
                <>
                  <Link href={dashboardHref} onClick={() => setOpen(false)}
                    className="px-3 py-2.5 text-sm text-[#6b7378] hover:bg-[#f0f7ff] hover:text-[#006cd2]">Dashboard</Link>
                  <button onClick={() => { setOpen(false); handleLogout(); }}
                    className="inline-flex items-center justify-center gap-1.5 border border-[#e4e8ed] px-4 py-2.5 text-sm font-medium text-[#6b7378]">
                    <LogOut className="h-3.5 w-3.5" /> Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)}
                    className="px-3 py-2.5 text-sm text-[#6b7378] hover:bg-[#f0f7ff] hover:text-[#006cd2]">Sign in</Link>
                  <Link href="/signup" onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center bg-[#006cd2] px-4 py-2.5 text-sm font-semibold text-white">
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
