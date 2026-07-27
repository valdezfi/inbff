"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Link2, DollarSign, CreditCard,
  Menu, X, LogOut, Bell, Store, ChevronRight, Sparkles, Settings,
} from "lucide-react";

const nav = [
  { label: "Overview",    href: "/affiliate/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Programs",    href: "/affiliate/programs",  icon: Link2,           exact: false },
  { label: "Earnings",    href: "/affiliate/earnings",  icon: DollarSign,      exact: false },
  { label: "Payouts",     href: "/affiliate/payouts",   icon: CreditCard,      exact: false },
  { label: "Marketplace", href: "/marketplace",         icon: Store,           exact: false },
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function NavItem({
  label, href, icon: Icon, exact, pathname, onClick,
}: {
  label: string; href: string; icon: React.ElementType;
  exact: boolean; pathname: string; onClick?: () => void;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
          : "text-white/60 hover:bg-white/8 hover:text-white/90"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
      )}
      <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
    </Link>
  );
}

export default function AffiliateShell({
  children, userName, userEmail, role,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  role: string;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const currentNav = nav.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href)
  );

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`sidebar-gradient-affiliate flex flex-col ${mobile ? "w-72" : "w-64 hidden lg:flex"}`}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg ring-1 ring-white/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base">inBFF</span>
          <span className="ml-1.5 rounded-full bg-blue-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-blue-200 uppercase tracking-wider">
            Affiliate
          </span>
        </div>
        {mobile && (
          <button onClick={() => setOpen(false)} className="ml-auto text-white/50 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Main Menu
        </p>
        {nav.map(({ label, href, icon, exact }) => (
          <NavItem
            key={href}
            label={label}
            href={href}
            icon={icon}
            exact={exact}
            pathname={pathname}
            onClick={() => setOpen(false)}
          />
        ))}

        {role === "both" && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Switch View
            </p>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all"
            >
              <LayoutDashboard className="h-4 w-4 text-white/50" />
              Creator Dashboard
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom: user card */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all">
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <div className="mt-1 flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white shadow-md">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-white/30 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dash flex h-screen w-full overflow-hidden" style={{ background: "#f4f6fa" }}>
      <Sidebar />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 animate-slide-in-right"><Sidebar mobile /></div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-5 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">Affiliate</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-semibold text-slate-700">
                {currentNav?.label ?? "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
              <Bell className="h-4 w-4" />
            </button>
            <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-md ring-2 ring-white">
              {initials(userName)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <div className="mx-auto max-w-5xl animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
