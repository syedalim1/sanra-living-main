"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { whatsappHref } from "@/lib/company";

const ENQUIRY_LINK = whatsappHref(
  "Hello SANRA LIVING, I would like to enquire about factory steel furniture."
);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Products", href: "/products" },
    { label: "B2B / Architects", href: "/b2b" },
    { label: "Track Order", href: "/track" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Subhead */}
          <Link href="/" className="flex flex-col group">
            <span className="text-lg sm:text-xl font-black tracking-tight text-[#111111] group-hover:opacity-85 transition-opacity uppercase">
              SANRA LIVING
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Indian Make Steel Industries • SIDCO Coimbatore
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-8 whitespace-nowrap">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-700 hover:text-black transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={ENQUIRY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors shadow-sm whitespace-nowrap"
            >
              Factory Enquiry
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Mobile Hamburger Button (Single header only) */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-800 hover:text-black focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded-md"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-base font-medium text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <a
                href={ENQUIRY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-md text-sm font-semibold uppercase tracking-wider bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
              >
                WhatsApp Factory Enquiry
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

