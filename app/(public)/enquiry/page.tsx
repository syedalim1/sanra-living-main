import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EnquiryBasketClient from "@/components/EnquiryBasketClient";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  title: `Enquiry List & Bulk Quote | ${SITE_NAME}`,
  description:
    "Review your selected steel furniture configurations, refresh factory prices, and send a combined enquiry on WhatsApp or download a quotation PDF.",
  alternates: { canonical: `${SITE_URL}/enquiry` },
};

export default function EnquiryPage() {
  return (
    <div className="sanra-subpage min-h-[70vh] py-10 md:py-14">
      <div className="sanra-container space-y-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Continue Browsing
        </Link>

        <div>
          <p className="sanra-label">Factory Quotation</p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight mt-1">
            Enquiry List
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Prices are refreshed live from our server. Submit all items together via WhatsApp or download a PDF quotation.
          </p>
        </div>

        <EnquiryBasketClient />
      </div>
    </div>
  );
}
