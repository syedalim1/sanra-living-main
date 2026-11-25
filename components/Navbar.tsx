"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Brand from "@/components/public/Brand";

const links = [
  { href: "/products", label: "Collections" },
  { href: "/projects", label: "Our Projects" },
  { href: "/b2b", label: "Trade & projects" },
  { href: "/track", label: "Track order" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarContent pathname="" />}>
      <CurrentNavbar />
    </Suspense>
  );
}

function CurrentNavbar() {
  const pathname = usePathname();
  return <NavbarContent pathname={pathname} />;
}

function NavbarContent({ pathname }: { pathname: string }) {
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = openOnPath === pathname;

  return (
    <header
      className="sanra-header"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        setOpenOnPath(null);
        trigger.current?.focus();
      }}
    >
      <div className="sanra-container sanra-header-inner">
        <Brand onClick={() => setOpenOnPath(null)} />
        <button
          ref={trigger}
          className="sanra-menu-toggle"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="sanra-navigation"
          onClick={() => setOpenOnPath(open ? null : pathname)}
        >
          {open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
        </button>
        <nav id="sanra-navigation" className="sanra-navigation" data-open={open} aria-label="Main navigation">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/") || (href === "/products" && pathname.startsWith("/sets"));
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpenOnPath(null)}>
                {label}
              </Link>
            );
          })}
          <Link href="/b2b#bulk" className="sanra-button sanra-button--ink" onClick={() => setOpenOnPath(null)}>
            Get a bulk quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
