import React from "react";
import SectionHeading from "@/components/SectionHeading";
import Link from "next/link";
import { ArrowLeft, MessageSquare, MapPin, Phone, Clock, FileText } from "lucide-react";

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
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
          {/* Unit Location Info */}
          <div className="p-8 rounded-xl bg-[#F5F5F7] border border-neutral-200 flex flex-col justify-between">
            <div className="space-y-5">
              <h3 className="text-xl font-bold text-[#111111]">
                SANRA LIVING Works Unit
              </h3>
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Indian Make Steel Industries
              </p>

              <div className="space-y-4 text-sm text-neutral-700 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">SIDCO Industrial Estate</strong>
                    <span>Kurichi, Coimbatore, Tamil Nadu 641021, India</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Factory Desk</strong>
                    <span>+91 91XXXXXXXXXX</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Operating Hours</strong>
                    <span>Monday – Saturday: 9:00 AM – 7:00 PM IST</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#111111]">Commercial Invoicing</strong>
                    <span>GSTIN: 33XXXXX0000X1Z5 (Input Tax Credit Eligible)</span>
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
              <h3 className="text-2xl font-bold tracking-tight">Direct WhatsApp Desk</h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Connect directly with our manufacturing desk for fast estimates, drawing evaluations, surface finish options, and bulk transport logistics.
              </p>
            </div>

            <div className="pt-8">
              <a
                href="https://wa.me/91XXXXXXXXXX?text=Hello%20SANRA%20LIVING,%20I%20have%20an%20enquiry%20regarding%20factory%20furniture."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with SIDCO Coimbatore Desk
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

