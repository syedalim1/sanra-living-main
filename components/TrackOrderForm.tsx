"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  STAGES,
  STAGE_LABELS,
  type Stage,
} from "@/lib/tracking/types";
import { normalizeTrackingCode } from "@/lib/tracking/mask";

interface TrackPhoto {
  url: string;
  caption: string | null;
}

interface TrackResult {
  customer_name_masked: string;
  customer_phone_masked: string;
  current_stage: Stage;
  stage_timeline: Array<{ stage: Stage; at: string }>;
  photos: TrackPhoto[];
  product_lines: Array<{ name: string; size: string; quantity: number }>;
  warranty_expiry_date: string | null;
  warranty_available: boolean;
}

const GENERIC_ERROR =
  "No order found. Please check your code and phone digits.";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  );
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function TrackPhotoCard({
  photo,
  onClick,
  large = false,
}: {
  photo: TrackPhoto;
  onClick?: () => void;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`rounded-lg bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center text-neutral-400 ${
          large ? "aspect-video" : "aspect-square"
        }`}
      >
        <ImageIcon className="w-6 h-6 mb-1" />
        <span className="text-[10px]">Photo unavailable</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`block w-full text-left rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 ${
        onClick ? "hover:border-neutral-400" : ""
      }`}
    >
      <div
        className={`relative w-full ${
          large ? "aspect-video" : "aspect-square"
        }`}
      >
        <Image
          src={photo.url}
          alt={photo.caption ?? "Order progress photo"}
          fill
          sizes={large ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      </div>
      {photo.caption && (
        <span className="block px-3 py-2 text-[11px] font-semibold text-neutral-700 bg-white">
          {photo.caption}
        </span>
      )}
    </button>
  );
}

export default function TrackOrderForm({
  whatsappNumber,
}: {
  whatsappNumber: string;
}) {
  const [code, setCode] = useState("");
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [submittedCode, setSubmittedCode] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const meta = document.createElement("meta");
    meta.id = "track-result-robots";
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      meta.remove();
    };
  }, [result]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setWarrantyError(null);

    const normalized = normalizeTrackingCode(code);
    if (!normalized || last4.replace(/\D/g, "").length < 4) {
      setError(GENERIC_ERROR);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_code: normalized,
          phone_last_4: last4,
        }),
      });

      const body = (await res.json()) as TrackResult & { error?: string };

      if (!res.ok) {
        setError(body.error || GENERIC_ERROR);
        setResult(null);
        return;
      }

      setSubmittedCode(normalized);
      setResult(body);
    } catch {
      setError(GENERIC_ERROR);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setWarrantyError(null);
    setGalleryOpen(false);
  };

  const downloadWarranty = async () => {
    if (!result?.warranty_available || warrantyLoading) return;

    setWarrantyLoading(true);
    setWarrantyError(null);

    try {
      const res = await fetch("/api/warranty-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_code: submittedCode,
          phone_last_4: last4,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setWarrantyError(
          body?.error || "Warranty certificate is not available yet."
        );
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || `SANRA-Warranty-${submittedCode}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setWarrantyError("Could not download the warranty certificate.");
    } finally {
      setWarrantyLoading(false);
    }
  };

  if (result) {
    const timelineMap = new Map(
      result.stage_timeline.map((entry) => [entry.stage, entry.at])
    );
    const currentIndex = STAGES.indexOf(result.current_stage);
    const latestPhoto = result.photos[0];
    const whatsappBase = whatsappNumber
      ? `https://wa.me/${whatsappNumber}`
      : "https://wa.me/";
    const whatsappHref = `${whatsappBase}?text=${encodeURIComponent(
      `Hi SANRA LIVING, I'd like to ask about my order ${submittedCode}.`
    )}`;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Tracking code
              </p>
              <p className="font-mono text-lg font-black text-[#111111]">
                {submittedCode}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                {STAGE_LABELS[result.current_stage]}
              </span>
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1.5 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
              >
                Check another
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                Customer
              </p>
              <p className="font-bold text-neutral-900 mt-1">
                {result.customer_name_masked}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                Phone
              </p>
              <p className="font-bold text-neutral-900 mt-1">
                {result.customer_phone_masked}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4">
              Factory Progress
            </h2>

            <ol className="space-y-1">
              {STAGES.map((stage, index) => {
                const finished = index < currentIndex;
                const current = index === currentIndex;
                const at = timelineMap.get(stage);

                return (
                  <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < STAGES.length - 1 && (
                      <span
                        className={`absolute left-[13px] top-7 bottom-0 w-px ${
                          finished || current ? "bg-neutral-900" : "bg-neutral-200"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        current
                          ? "bg-emerald-700 border-emerald-600 text-white ring-4 ring-emerald-100"
                          : finished
                          ? "bg-neutral-900 border-neutral-900 text-white"
                          : "bg-neutral-100 border-neutral-200 text-neutral-400"
                      }`}
                    >
                      {finished ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </span>
                    <div className="pt-0.5">
                      <p
                        className={`text-xs font-bold ${
                          current
                            ? "text-emerald-800"
                            : finished
                            ? "text-neutral-900"
                            : "text-neutral-400"
                        }`}
                      >
                        {STAGE_LABELS[stage]}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {at ? formatDate(at) : "Pending"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
              Latest Factory Photo
            </h2>

            {latestPhoto ? (
              <TrackPhotoCard
                photo={latestPhoto}
                large
                onClick={() => setGalleryOpen(true)}
              />
            ) : (
              <div className="aspect-video rounded-lg bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center text-neutral-400">
                <ImageIcon className="w-7 h-7 mb-2" />
                <span className="text-[11px]">No customer-visible photo yet.</span>
              </div>
            )}

            {result.photos.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="text-[11px] font-bold text-neutral-700 underline underline-offset-2"
              >
                View all {result.photos.length} photos
              </button>
            )}

            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">
                Your Items
              </h2>
              <ul className="space-y-2">
                {result.product_lines.map((line, index) => (
                  <li
                    key={index}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200"
                  >
                    <div>
                      <p className="text-xs font-bold text-neutral-900">
                        {line.name}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {line.size}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                      Qty {line.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-[#111111]">
                Warranty Certificate
              </h2>
              {result.warranty_available && result.warranty_expiry_date ? (
                <p className="text-xs text-neutral-600 mt-1">
                  Valid until {formatDate(result.warranty_expiry_date)}.
                </p>
              ) : (
                <p className="text-xs text-neutral-600 mt-1">
                  Warranty certificate will be available when your order is ready.
                </p>
              )}
            </div>
          </div>

          {result.warranty_available && result.warranty_expiry_date && (
            <button
              type="button"
              onClick={downloadWarranty}
              disabled={warrantyLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              {warrantyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Warranty Certificate (PDF)
            </button>
          )}

          {warrantyError && (
            <p className="text-[11px] font-semibold text-red-700">
              {warrantyError}
            </p>
          )}

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800"
          >
            <MessageCircle className="w-4 h-4" />
            Ask about my order
          </a>
        </div>

        {galleryOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 p-4 sm:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">
                  Factory Progress Photos
                </h2>
                <button
                  type="button"
                  onClick={() => setGalleryOpen(false)}
                  aria-label="Close gallery"
                  className="p-2 rounded-md text-white/80 hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.photos.map((photo, index) => (
                  <TrackPhotoCard key={index} photo={photo} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-7 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Tracking code
          </span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="SANRA-7K9P"
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-black"
          />
          <span className="block text-[10px] text-neutral-500">
            With or without the SANRA- prefix.
          </span>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Last 4 digits of phone
          </span>
          <input
            value={last4}
            onChange={(event) =>
              setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            maxLength={4}
            placeholder="5303"
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>
      </div>

      {error && (
        <div
          aria-live="polite"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {loading ? "Checking..." : "Check Status"}
      </button>

      <div className="pt-3 border-t border-neutral-100 flex items-start gap-2 text-[10px] text-neutral-500">
        <LockKeyhole className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          For your privacy, tracking needs both the code and the last 4 digits
          of the order phone. Never share your code publicly.
        </p>
      </div>
    </form>
  );
}
