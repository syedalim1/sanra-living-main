import React from "react";
import SectionHeading from "@/components/SectionHeading";
import Link from "next/link";
import { ArrowLeft, MessageSquare, MapPin, Phone, Clock, FileText } from "lucide-react";
import type { Metadata } from "next";
import { company, whatsappHref, WORKING_HOURS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact & Factory Location | SANRA LIVING",
  description:
    "Visit the SANRA LIVING SIDCO Coimbatore factory or contact the project desk on WhatsApp for steel furniture enquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact & Factory Location | SANRA LIVING",
    description: "Factory address, phone and WhatsApp contact for SANRA LIVING.",
    url: "/contact",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "SANRA LIVING factory contact" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Factory Location | SANRA LIVING",
    description: "Factory address, phone and WhatsApp contact for SANRA LIVING.",
    images: ["/og-default.png"],
  },
};

export default function ContactPage() {
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
          badge="Direct Unit Access"
          title="Factory Location & Enquiries"
          subtitle="Visit our SIDCO Kurichi manufacturing facility or connect with our engineering desk directly on WhatsApp."
          as="h1"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
          {/* Unit Location Info */}
          <div className="p-8 rounded-xl bg-[#F5F5F7] border border-neutral-200 flex flex-col justify-between">
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-[#111111]">
                SANRA LIVING Works Unit
              </h2>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Indian Make Steel Industries
              </p>

              <div className="space-y-4 text-sm text-neutral-700 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Factory Address</strong>
                    <span>{company.address}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs font-bold uppercase tracking-wider text-emerald-700 underline underline-offset-2"
                    >
                      Open in Maps
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Factory Desk</strong>
                    <span>{company.phone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Operating Hours</strong>
                    <span>{WORKING_HOURS}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Commercial Invoicing</strong>
                    <span>GSTIN: {company.gstin} (Input Tax Credit Eligible)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Connect */}
          <div className="p-8 rounded-xl bg-[#111111] text-white flex flex-col justify-between">
            <div className="space-y-4">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Messaging
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Direct WhatsApp Desk</h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Connect directly with our manufacturing desk for fast estimates, drawing evaluations, surface finish options, and bulk transport logistics.
              </p>
            </div>

            <div className="pt-8 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                WhatsApp: {company.whatsappDisplayNumber}
              </p>
              <a
                href={whatsappHref(
                  "Hi SANRA LIVING, I'd like to know more about your steel furniture."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with SIDCO Coimbatore Desk
              </a>
              {!company.whatsappNumber && (
                <p className="text-[11px] font-semibold text-amber-300">
                  UPDATE ME: add NEXT_PUBLIC_WHATSAPP_NUMBER to .env.local
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

