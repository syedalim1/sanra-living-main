// REVIEW WITH A LEGAL ADVISOR BEFORE LAUNCH
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { company, whatsappHref } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy | SANRA LIVING",
  description:
    "How SANRA LIVING uses enquiry, lead and order details to respond to requests and fulfil furniture orders.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
          badge="Privacy"
          title="Privacy Policy"
          subtitle="We keep this plain and short. Replace this placeholder with your reviewed policy before launch."
          align="left"
          as="h1"
        />

        <div className="space-y-6 text-sm text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Details we collect
            </h2>
            <p>
              We collect the name, phone number and optional email, company and
              city you enter in sample, CAD or bulk quote forms. For orders we
              collect the details needed to manufacture, deliver and warrant the
              furniture.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              How we use them
            </h2>
            <p>
              Lead and order details are used only to respond to your request
              and to fulfil orders. We do not sell your details or add you to
              unrelated marketing lists.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Sharing and retention
            </h2>
            <p>
              We share details only with service providers needed to host the
              site, store files, deliver orders or provide warranty support. We
              keep records only as long as needed for the enquiry, order,
              warranty and legal records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">
              Your choices
            </h2>
            <p>
              You can ask us to correct or remove enquiry details by contacting
              the factory desk. Order records may need to be retained for
              warranty and statutory records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#111111] mb-2">Contact</h2>
            <p>{company.address}</p>
            <p className="mt-1">Phone: {company.phone}</p>
            <a
              href={whatsappHref(
                "Hi SANRA LIVING, I have a question about my privacy and data."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs font-bold uppercase tracking-wider text-emerald-700 underline underline-offset-2"
            >
              Contact on WhatsApp
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
