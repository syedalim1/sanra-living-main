import React from "react";
import Link from "next/link";
import { MessageSquare, MapPin, Phone, ShieldCheck, FileCheck } from "lucide-react";
import { company, whatsappHref } from "@/lib/company";

export default function Footer() {
  return (
    <footer className="bg-[#111111] text-neutral-300 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Brief */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-white text-lg font-black tracking-wider uppercase">
              SANRA LIVING
            </h3>
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Indian Make Steel Industries
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Direct steel furniture manufacturing unit in SIDCO Industrial Estate, Coimbatore. Heavy-gauge MS & Jindal SS frames engineered for zero wobble.
            </p>
            <div className="pt-2">
              <span className="inline-block bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs px-2.5 py-1 rounded">
                GSTIN: {company.gstin} (GST Invoice Provided)
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Factory Catalog
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Products & Live Prices
                </Link>
              </li>
              <li>
                <Link href="/b2b" className="hover:text-white transition-colors">
                  B2B / Architect Portal
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Factory Location & Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Sourcing & Specs */}
          <div>
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Certified Materials
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-400">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>Tata MS & Jindal Stainless Steel Pipes</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>100% Seasoned Grade-A Kerala Rubberwood</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>18mm Export-Grade Krishnagiri Granite</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>10-Yr MIG Structural Warranty</span>
              </li>
            </ul>
          </div>

          {/* SIDCO Factory Contact */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
              Factory Unit
            </h4>
            <div className="text-sm text-neutral-400 space-y-2.5">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <span>{company.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-300 shrink-0" />
                <span>{company.phone}</span>
              </p>
              <div className="pt-2">
                <a
                  href={whatsappHref("Hello SANRA LIVING Factory, I have an enquiry.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© 2026 SANRA LIVING | Indian Make Steel Industries. All rights reserved.</p>
          <p className="text-neutral-400">Direct SIDCO Coimbatore Factory • Live Factory Pricing</p>
        </div>
      </div>
    </footer>
  );
}
