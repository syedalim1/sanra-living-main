import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { company, whatsappHref } from "@/lib/company";

export default function NotFound() {
  return (
    <div className="min-h-[65vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center space-y-5">
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full">
          404
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
          This page cannot be found
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          The link may be old or the page may have moved. Browse the catalog or
          ask the factory desk for help.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
          >
            Back to Home
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-100"
          >
            Browse Products
          </Link>
          <a
            href={whatsappHref(
              "Hi SANRA LIVING, I could not find a page on your website."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
        <p className="text-[10px] text-neutral-500">{company.phone}</p>
      </div>
    </div>
  );
}
