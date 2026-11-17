import React from "react";
import SectionHeading from "@/components/SectionHeading";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Building2, DraftingCompass, FileSpreadsheet, ShieldCheck } from "lucide-react";

export default function B2BPage() {
  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        <SectionHeading
          badge="Commercial & Projects"
          title="B2B & Architect Desk"
          subtitle="Direct manufacturing partnership for architects, turnkey interior contractors, cafe chains, and institutional procurement teams."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
          <div className="p-6 bg-[#F5F5F7] rounded-xl border border-neutral-200">
            <DraftingCompass className="w-8 h-8 text-[#111111] mb-4" />
            <h3 className="text-base font-bold text-[#111111] mb-2">Architectural Customisation</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Submit your CAD/PDF dimensional drawings. We produce exact structural prototypes with sample surface swatches.
            </p>
          </div>

          <div className="p-6 bg-[#F5F5F7] rounded-xl border border-neutral-200">
            <Building2 className="w-8 h-8 text-[#111111] mb-4" />
            <h3 className="text-base font-bold text-[#111111] mb-2">Turnkey Cafe & Office Rollouts</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Standardized tables and stools for multi-outlet retail brands. Guaranteed batch consistency and scheduled phase deliveries.
            </p>
          </div>

          <div className="p-6 bg-[#F5F5F7] rounded-xl border border-neutral-200">
            <FileSpreadsheet className="w-8 h-8 text-[#111111] mb-4" />
            <h3 className="text-base font-bold text-[#111111] mb-2">GST Invoicing & Input Credit</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Transparent factory billings with clear HSN coding, commercial GST tax invoices, and full transport insurance dispatch.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-xl bg-[#111111] text-white text-center max-w-2xl mx-auto space-y-4">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold tracking-tight">Connect with Our Chief Works Engineer</h3>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Send your project BOQ (Bill of Quantities) directly to our SIDCO Coimbatore factory WhatsApp desk for same-day estimates.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/91XXXXXXXXXX?text=Hello%20SANRA%20LIVING,%20I%20have%20a%20B2B%20/%20Architectural%20enquiry."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow"
            >
              <MessageSquare className="w-4 h-4" />
              Submit BOQ via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

