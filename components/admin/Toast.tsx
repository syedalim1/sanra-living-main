"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type ToastKind = "success" | "error";

export default function AdminToast({
  kind,
  message,
  onClose,
}: {
  kind: ToastKind;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-20 lg:top-6 right-4 z-[70] max-w-sm flex items-start gap-3 p-3.5 rounded-lg border shadow-lg ${
        kind === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-red-50 border-red-200 text-red-900"
      }`}
    >
      {kind === "success" ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
      )}
      <p className="text-xs font-semibold leading-relaxed flex-1">{message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="shrink-0">
        <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}
