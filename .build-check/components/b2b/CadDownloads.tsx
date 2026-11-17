"use client";

import { useState } from "react";
import {
  Download,
  FileBox,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import type { B2BCadFile } from "@/lib/b2b/types";

interface CadFormState {
  name: string;
  phone: string;
  email: string;
  company: string;
}

const emptyForm: CadFormState = {
  name: "",
  phone: "",
  email: "",
  company: "",
};

export default function CadDownloads({
  files,
  whatsappNumber,
}: {
  files: B2BCadFile[];
  whatsappNumber: string;
}) {
  const [selectedFile, setSelectedFile] = useState<B2BCadFile | null>(null);
  const [form, setForm] = useState<CadFormState>(emptyForm);
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const whatsappBase = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

  const openFile = (file: B2BCadFile) => {
    setSelectedFile(file);
    setError(null);
    setDownloaded(false);
  };

  const close = () => {
    setSelectedFile(null);
    setForm(emptyForm);
    setWebsite("");
    setError(null);
    setDownloaded(false);
  };

  const update = (field: keyof CadFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/b2b/cad-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, ""),
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          file_id: selectedFile.id,
          website,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!res.ok || !body?.url) {
        setError(body?.error || "Could not prepare this model download.");
        return;
      }

      const safeTitle = selectedFile.title.replace(/[^A-Za-z0-9_-]+/g, "-");
      const link = document.createElement("a");
      link.href = body.url;
      link.download = `${safeTitle}.${selectedFile.file_type.toLowerCase()}`;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDownloaded(true);
    } catch {
      setError("Could not prepare this model download.");
    } finally {
      setLoading(false);
    }
  };

  if (files.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-[#F5F5F7] border border-neutral-200 text-center space-y-3">
        <FileBox className="w-8 h-8 text-neutral-500 mx-auto" />
        <p className="text-sm font-bold text-neutral-900">
          Models coming soon. Request them on WhatsApp
        </p>
        <a
          href={`${whatsappBase}?text=${encodeURIComponent(
            "Hi SANRA LIVING, please share the CAD / SketchUp models for my project."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700"
        >
          <MessageCircle className="w-4 h-4" />
          Request CAD models
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="p-4 rounded-xl bg-white border border-neutral-200 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-neutral-900">{file.title}</p>
                {file.product_name && (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {file.product_name}
                  </p>
                )}
              </div>
              <span className="px-2 py-0.5 rounded bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-wider">
                {file.file_type}
              </span>
            </div>

            {file.description && (
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                {file.description}
              </p>
            )}

            <button
              type="button"
              onClick={() => openFile(file)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-black bg-white text-[10px] font-bold uppercase tracking-wider text-black hover:bg-neutral-100"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-neutral-500">
        Models are for design reference. Final dimensions are confirmed before
        manufacturing.
      </p>

      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Download {selectedFile.file_type}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {selectedFile.title}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close CAD download form"
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {downloaded ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                Download started. If it did not start, check your browser
                downloads.
                <button
                  type="button"
                  onClick={close}
                  className="block mt-3 text-[10px] font-bold uppercase tracking-wider underline underline-offset-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Name"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
                />
                <input
                  value={form.phone}
                  onChange={(event) =>
                    update(
                      "phone",
                      event.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  placeholder="Phone (10 digits)"
                  inputMode="numeric"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="Email (optional)"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
                />
                <input
                  value={form.company}
                  onChange={(event) => update("company", event.target.value)}
                  placeholder="Firm (optional)"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
                />

                <input
                  type="text"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                {error && (
                  <p
                    aria-live="polite"
                    className="p-2.5 rounded-md bg-red-50 border border-red-200 text-[10px] font-semibold text-red-800"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {loading ? "Preparing..." : "Start download"}
                </button>

                <p className="text-[10px] text-neutral-500">
                  We use your details only to respond to your request.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
