"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import type { B2BProduct } from "@/lib/b2b/types";
import { SAMPLE_NEEDS } from "@/lib/b2b/leads";

interface SampleFormState {
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  product: string;
  need: keyof typeof SAMPLE_NEEDS;
  notes: string;
}

const initialForm: SampleFormState = {
  name: "",
  phone: "",
  email: "",
  company: "",
  city: "",
  product: "",
  need: "MATERIAL_SWATCH",
  notes: "",
};

export default function SampleRequestForm({
  products,
  whatsappNumber,
}: {
  products: B2BProduct[];
  whatsappNumber: string;
}) {
  const [form, setForm] = useState<SampleFormState>({
    ...initialForm,
    product: products[0]?.sku ?? "",
  });
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedProduct = products.find((product) => product.sku === form.product);

  const update = (
    field: keyof SampleFormState,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/b2b/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, ""),
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          website,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        setError(body?.error || "Could not submit the request. Please try again.");
        return;
      }

      setSuccess(
        body?.message ||
          "Request received. Our team will contact you on WhatsApp shortly."
      );
    } catch {
      setError("Could not submit the request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappBase = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  const whatsappSummary = `Hi SANRA LIVING, I sent a sample request.
Name: ${form.name}
City: ${form.city}
Product: ${selectedProduct?.name ?? form.product} (${form.product})
Needed: ${SAMPLE_NEEDS[form.need]}
Notes: ${form.notes || "—"}`;

  if (success) {
    return (
      <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
        <p className="text-sm font-bold text-emerald-900">{success}</p>
        <p className="text-xs text-emerald-800">
          Express sample requests are prioritized.
        </p>
        <a
          href={`${whatsappBase}?text=${encodeURIComponent(whatsappSummary)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800"
        >
          <MessageCircle className="w-4 h-4" />
          Continue on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setForm({ ...initialForm, product: products[0]?.sku ?? "" });
            setWebsite("");
          }}
          className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 underline underline-offset-2"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Name
          </span>
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Phone (10 digits)
          </span>
          <input
            value={form.phone}
            onChange={(event) =>
              update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            inputMode="numeric"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Email (optional)
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Company / firm (optional)
          </span>
          <input
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            City
          </span>
          <input
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Product
          </span>
          <select
            value={form.product}
            onChange={(event) => update("product", event.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
          >
            {products.map((product) => (
              <option key={product.sku} value={product.sku}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            What do you need?
          </span>
          <select
            value={form.need}
            onChange={(event) =>
              update("need", event.target.value as SampleFormState["need"])
            }
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
          >
            {Object.entries(SAMPLE_NEEDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
            Notes (max 500 characters)
          </span>
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value.slice(0, 500))}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <span className="block text-right text-[9px] text-neutral-400">
            {form.notes.length}/500
          </span>
        </label>
      </div>

      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && (
        <div
          aria-live="polite"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="submit"
          disabled={loading || products.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? "Sending..." : "Request Sample"}
        </button>
        <p className="text-[10px] text-neutral-500">
          Express sample requests are prioritized.
        </p>
      </div>

      <p className="text-[10px] text-neutral-500">
        We use your details only to respond to your request.
      </p>
    </form>
  );
}
