import React from "react";
import SectionHeading from "@/components/SectionHeading";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Truck, Clock, ShieldCheck } from "lucide-react";

export default function TrackPage() {
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
          badge="Factory Logistics Desk"
          title="Track Order Status"
          subtitle="Real-time dispatch status directly from our SIDCO Coimbatore manufacturing facility."
        />

        <div className="max-w-2xl mx-auto mt-8 p-8 rounded-xl bg-[#F5F5F7] border border-neutral-200">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-lg border border-neutral-200 text-[#111111] shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">Direct Factory Despatches</h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Local Coimbatore deliveries are routed directly via our dedicated factory tempo network. Pan-India flat-pack orders ship via express freight with real-time consignment docket tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-lg border border-neutral-200 text-[#111111] shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">Live Dispatch Assistance</h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  To check fabrication progress, welding completion, or the courier tracking LR number for your consignment, message our logistics desk with your Order/Invoice ID.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 text-center">
              <a
                href="https://wa.me/91XXXXXXXXXX?text=Hello%20SANRA%20LIVING,%20I%20would%20like%20to%20track%20my%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow"
              >
                <MessageSquare className="w-4 h-4" />
                Track Order via Factory WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

