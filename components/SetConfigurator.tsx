"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, FileDown, ChevronDown } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";

export interface SetConfigOption {
  code: string;
  label: string;
  badge?: string | null;
  note?: string | null;
}

export interface SetConfigGroup {
  code: string;
  title: string;
  options: SetConfigOption[];
}

export interface SetConfigItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  allowCustomize: boolean;
  groups: SetConfigGroup[];
  defaultSelection: Record<string, string>;
}

interface SetConfiguratorProps {
  sku: string;
  name: string;
  description: string | null;
  mainImage: string | null;
  hoverImage: string | null;
  items: SetConfigItem[];
}

export default function SetConfigurator({
  sku,
  name,
  description,
  mainImage,
  hoverImage,
  items,
}: SetConfiguratorProps) {
  const initialSelections = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const item of items) map[item.id] = { ...item.defaultSelection };
    return map;
  }, [items]);

  const [selections, setSelections] = useState(initialSelections);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<{ unit_price?: number; total_price?: number; requires_quote?: boolean }>({});
  const [calculating, setCalculating] = useState(true);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "whatsapp" | "pdf" | "error">("idle");
  const [gallery, setGallery] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCalculating(true);
      try {
        const res = await fetch("/api/set-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku,
            quantity,
            item_selections: selections,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setPrice(json);
        }
      } finally {
        if (!cancelled) setCalculating(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sku, quantity, selections]);

  function updateSelection(itemId: string, group: string, code: string) {
    setSelections((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [group]: code },
    }));
  }

  async function request(endpoint: string, download: boolean) {
    setStatus(download ? "pdf" : "whatsapp");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, quantity, item_selections: selections }),
      });
      if (!res.ok) throw new Error("Request failed");

      if (download) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SANRA-${sku}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("Invalid link");
        window.location.href = data.url;
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const images = [mainImage, hoverImage].filter(Boolean) as string[];
  const total = price.requires_quote ? null : price.total_price ?? null;
  const unit = price.requires_quote ? null : price.unit_price ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-6 space-y-3">
        <div className="rounded-xl overflow-hidden border border-neutral-200">
          <WatermarkedImage
            key={images[gallery] ?? "set-image"}
            src={images[gallery] ?? null}
            fallbackSrc={mainImage ?? null}
            alt={name}
            aspectRatio="video"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setGallery(index)}
                className={`w-16 h-16 rounded border overflow-hidden ${
                  gallery === index ? "border-black" : "border-neutral-200"
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <WatermarkedImage src={src} alt="" aspectRatio="square" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-6 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            {name}
          </h1>
          {description && (
            <p className="text-sm text-neutral-600 mt-2">{description}</p>
          )}
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <details
              key={item.id}
              className="border border-neutral-200 rounded-lg bg-white"
            >
              <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold">
                <span>
                  {item.name} <span className="text-neutral-500">× {item.quantity}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              </summary>
              <div className="px-4 pb-4 space-y-3">
                <p className="text-[10px] font-mono text-neutral-500">{item.sku}</p>
                {item.allowCustomize ? (
                  item.groups.map((group) => (
                    <label
                      key={group.code}
                      className="block space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                    >
                      {group.title}
                      <select
                        value={selections[item.id]?.[group.code] ?? ""}
                        onChange={(event) =>
                          updateSelection(item.id, group.code, event.target.value)
                        }
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal bg-white"
                      >
                        {group.options.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))
                ) : (
                  <p className="text-[11px] text-neutral-500">
                    Options are fixed for this set.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 bg-[#F5F5F7] space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Set quantity
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="w-8 h-8 rounded border border-neutral-300 text-lg leading-none"
                  aria-label="Decrease set quantity"
                >
                  −
                </button>
                <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(50, value + 1))}
                  className="w-8 h-8 rounded border border-neutral-300 text-lg leading-none"
                  aria-label="Increase set quantity"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right">
              {price.requires_quote ? (
                <p className="text-xl font-black text-[#111111]">Ask on WhatsApp</p>
              ) : total != null ? (
                <>
                  <p className="text-2xl font-black text-[#111111]">
                    ₹{total.toLocaleString("en-IN")}
                  </p>
                  {quantity > 1 && unit != null && (
                    <p className="text-[10px] text-neutral-500">
                      ₹{unit.toLocaleString("en-IN")} per set
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-neutral-600">
                  {calculating ? "Calculating…" : "Ask on WhatsApp"}
                </p>
              )}
            </div>
          </div>
          <p className="text-[10px] font-semibold text-neutral-600">
            Direct Factory Price • GST Invoice Available
          </p>
          {quantity >= 4 && (
            <p className="text-[10px] font-semibold text-neutral-600">
              Bulk discount available. Confirm best price on WhatsApp.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Delivery pincode
            <div className="flex gap-2 mt-1">
              <input
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                placeholder="6-digit PIN"
                className="w-32 px-3 py-2 rounded-md border border-neutral-300 text-sm"
              />
              <span className="text-[11px] text-neutral-500 self-center">
                {pin.length === 6
                  ? "Delivery confirmed on WhatsApp"
                  : "Enter your PIN code"}
              </span>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => request("/api/set-whatsapp-link", false)}
            disabled={status === "whatsapp"}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-60"
          >
            <MessageSquare className="w-4 h-4" />
            {status === "whatsapp" ? "Preparing…" : "Book on WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => request("/api/set-quote-pdf", true)}
            disabled={status === "pdf"}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-60"
          >
            <FileDown className="w-4 h-4" />
            {status === "pdf" ? "Preparing…" : "Download Quote PDF"}
          </button>
        </div>
        {status === "error" && (
          <p className="text-xs font-semibold text-red-700">
            Unable to prepare the request. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
