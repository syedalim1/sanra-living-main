"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { STAGE_LABELS, type Stage } from "@/lib/tracking/types";

export default function OrderShareButtons({
  code,
  customerPhone,
  stage,
}: {
  code: string;
  customerPhone: string;
  stage: Stage;
}) {
  const [copied, setCopied] = useState(false);

  const copyTracking = async () => {
    const origin = window.location.origin;
    const text = `Tracking code: ${code}\nTrack: ${origin}/track`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the tracking details", text);
    }
  };

  const openWhatsApp = () => {
    const origin = window.location.origin;
    const message = `Hi, your SANRA LIVING order ${code} is now ${
      STAGE_LABELS[stage]
    }. To track it, open ${origin}/track and enter your code with the last 4 digits of your phone.`;
    const phone = customerPhone.replace(/\D/g, "").slice(-10);
    window.open(
      `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyTracking}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy tracking link & code"}
      </button>

      <button
        type="button"
        onClick={openWhatsApp}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800"
      >
        <MessageCircle className="w-3 h-3" />
        Send tracking info on WhatsApp
      </button>
    </div>
  );
}
