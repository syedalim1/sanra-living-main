"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  SlidersHorizontal,
  Package,
  ClipboardList,
  Users,
  FolderOpen,
  ListTree,
  Layers,
  ScrollText,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";

const NAV_ITEMS = [
  { label: "Rates", href: "/admin/rates", icon: SlidersHorizontal },
  { label: "Options", href: "/admin/options", icon: ListTree },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Sets", href: "/admin/sets", icon: Layers },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Leads", href: "/admin/leads", icon: Users, badgeKey: "leads" },
  { label: "CAD Files", href: "/admin/cad", icon: FolderOpen },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
];

function SidebarContent({
  email,
  newLeadCount,
  onNavigate,
}: {
  email: string;
  newLeadCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-[#111111] text-neutral-300">
      <div className="px-5 py-5 border-b border-neutral-800">
        <p className="text-base font-black tracking-tight text-white uppercase">SANRA LIVING</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mt-1">
          Factory Console
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                active
                  ? "bg-white text-black"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {item.badgeKey === "leads" && newLeadCount > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-[9px] font-black text-white flex items-center justify-center">
                  {newLeadCount > 99 ? "99+" : newLeadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-neutral-800 space-y-3">
        <div className="px-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Signed in as
          </p>
          <p className="text-xs text-neutral-200 truncate mt-1">{email}</p>
        </div>

        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Back to site
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminShell({
  email,
  newLeadCount,
  children,
}: {
  email: string;
  newLeadCount: number;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <SidebarContent email={email} newLeadCount={newLeadCount} />
      </aside>

      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-[#111111]">SANRA LIVING</p>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500">
              Factory Console
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open staff menu"
            className="p-2 rounded-md text-neutral-700 hover:bg-neutral-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close staff menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close staff menu"
                className="p-2 rounded-md text-neutral-300 hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent email={email} newLeadCount={newLeadCount} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
