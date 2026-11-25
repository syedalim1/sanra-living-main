"use client";

import Link from "next/link";
import { MessageSquare, RotateCcw } from "lucide-react";

export default function GlobalRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const whatsappBase = number ? `https://wa.me/${number}` : "https://wa.me/";
  const whatsappHref = `${whatsappBase}?text=${encodeURIComponent(
    "Hi SANRA LIVING, I hit an error on your website."
  )}`;

  return (
    <div className="min-h-[65vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center space-y-5">
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          Something went wrong
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
          We hit a temporary problem
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Please retry once. If it keeps happening, contact the factory desk on
          WhatsApp and we will help.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-100"
          >
            Back to Home
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
