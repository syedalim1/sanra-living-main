// REVIEW WITH A LEGAL ADVISOR BEFORE LAUNCH
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of Use | SANRA LIVING",
  description:
    "Short plain-language terms for using the SANRA LIVING website, quotes and factory order process.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="bg-white min-h-[70vh] py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
          REVIEW WITH A LEGAL ADVISOR BEFORE LAUNCH. This is a short
          plain-language placeholder.
        </div>

        <SectionHeading
          badge="Terms"
          title="Terms of Use"
          subtitle="Plain-language terms for using this website and placing a factory order."
          align="left"
          as="h1"
        />

        <div className="space-y-6 text-sm text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Website information
            </h2>
            <p>
              Product images, measurements and layouts are for reference.
              Confirm the final size, finish and configuration with the factory
              desk before production.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Quotes and orders
            </h2>
            <p>
              Quoted prices are valid for seven days unless stated otherwise.
              Orders begin after size confirmation and the agreed advance.
              Delivery charges, custom sizes and taxes are confirmed in the
              final invoice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Warranty
            </h2>
            <p>
              Warranty periods and exclusions are stated on the warranty
              certificate. Misuse, overloading, physical damage and salt or acid
              exposure on non-stainless items are excluded.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Contact
            </h2>
            <p>{company.address}</p>
            <p className="mt-1">Phone: {company.phone}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
