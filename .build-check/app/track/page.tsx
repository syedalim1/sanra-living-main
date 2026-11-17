import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import TrackOrderForm from "@/components/TrackOrderForm";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Track Your Order | SANRA LIVING",
  description:
    "Track your SANRA LIVING factory order with your tracking code and the last 4 digits of your order phone. View live fabrication stages and warranty status.",
};

export default function TrackPage() {
  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
          badge="Factory Tracking"
          title="Track Your Order"
          subtitle="Enter your tracking code and the last 4 digits of the phone used for the order. Your code is never placed in the page URL."
        />

        <div className="mt-8">
          <TrackOrderForm whatsappNumber={company.whatsappNumber} />
        </div>

        <div className="mt-6 flex items-start gap-2 p-4 rounded-lg bg-[#F5F5F7] border border-neutral-200">
          <ShieldCheck className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Tracking shows masked customer details, factory stage updates and
            customer-visible progress photos only. For privacy, no prices,
            addresses or full phone numbers are shown here.
          </p>
        </div>
      </div>
    </div>
  );
}
