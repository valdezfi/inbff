"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Store,
  Menu, X, LogOut, Bell, ChevronRight, Settings, HelpCircle,
} from "lucide-react";

const nav = [
  { label: "Overview",  href: "/dashboard",                 icon: LayoutDashboard, exact: true },
  { label: "Programs",  href: "/dashboard/programs",        icon: Users,           exact: false },
  { label: "Payouts",   href: "/dashboard/payouts",         icon: CreditCard,      exact: false },
  { label: "Stores",    href: "/dashboard/connect-shopify", icon: Store,           exact: false },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Landing-page logo mark (6 parallelograms)
function LogoMark() {
  return (
    <svg viewBox="0 0 42 34" aria-hidden="true" style={{ width: 22, height: "auto", fill: "currentColor" }}>
      <polygon points="12,0 30,0 33.2,3.2 15.2,3.2" />
      <polygon points="14.6,5.6 32.6,5.6 35.8,8.8 17.8,8.8" />
      <polygon points="17.2,11.2 35.2,11.2 38.4,14.4 20.4,14.4" />
      <polygon points="3.2,16.8 21.2,16.8 24.4,20 6.4,20" />
      <polygon points="5.8,22.4 23.8,22.4 27,25.6 9,25.6" />
      <polygon points="8.4,28 26.4,28 29.6,31.2 11.6,31.2" />
    </svg>
  );
}

function NavItem({ label, href, icon: Icon, exact, pathname, onClick }: {
  label: string; href: string; icon: React.ElementType;
  exact: boolean; pathname: string; onClick?: () => void;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        active ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/8 hover:text-white/90"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white" />}
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
    </Link>
  );
}

export default function DashboardShell({ children, userName, userEmail }: {
  children: React.ReactNode; userName: string; userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/"); router.refresh();
  }

  const currentNav = nav.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href));

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`sidebar-gradient flex flex-col ${mobile ? "w-64" : "w-60 hidden lg:flex"}`}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-5 border-b border-white/10">
        <div className="text-white"><LogoMark /></div>
        <div>
          <span className="font-bold text-white tracking-tight text-sm">Referly</span>
          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-semibold text-white/60 uppercase tracking-wider border border-white/20">
            Brand
          </span>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/50 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto mt-2">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Menu</p>
        {nav.map(({ label, href, icon, exact }) => (
          <NavItem key={href} label={label} href={href} icon={icon} exact={exact}
            pathname={pathname} onClick={() => setSidebarOpen(false)} />
        ))}
        <div className="pt-3 mt-3 border-t border-white/10">
          <Link href="/marketplace" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white/90 transition-all">
            <Store className="h-4 w-4 text-white/50" />
            Marketplace
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-white/10 space-y-0.5">
        <a href="mailto:support@referly.app"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all">
          <HelpCircle className="h-4 w-4" />Help & Support
        </a>
        <div className="flex items-center gap-3 bg-white/8 px-3 py-2.5 mt-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#006cd2] text-xs font-bold text-white">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
          </div>
          <button onClick={handleLogout} title="Log out" className="text-white/30 hover:text-red-400 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dash flex h-screen w-full overflow-hidden">
      <Sidebar />

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 animate-slide-in-right"><Sidebar mobile /></div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4e8ed] bg-white px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 hover:bg-slate-100 transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-[#6b7378] font-medium">Brand</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#6b7378]" />
              <span className="font-semibold text-[#0a0a0a]">{currentNav?.label ?? "Dashboard"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex h-8 w-8 items-center justify-center text-[#6b7378] hover:bg-[#f0f4f8] transition-all">
              <Bell className="h-4 w-4" />
            </button>
            <Link href="/dashboard/connect-shopify" title="Settings"
              className="flex h-8 w-8 items-center justify-center text-[#6b7378] hover:bg-[#f0f4f8] transition-all">
              <Settings className="h-4 w-4" />
            </Link>
            <div className="ml-1 flex h-7 w-7 items-center justify-center bg-[#006cd2] text-xs font-bold text-white">
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
