"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Lock, MessageSquare } from "lucide-react";

const STORAGE_KEY = "sanra-b2b-unlock";

export default function B2BPriceGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) setUnlocked(true);
      } catch {
        // Ignore storage access failures.
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 z-20 flex items-start justify-center pt-6 px-4">
        <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-[#111111]">
            <Lock className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Unlock factory wholesale prices
            </h2>
          </div>
          <p className="text-[11px] text-neutral-600">
            Enter your name and WhatsApp number to view the full B2B rate card. This
            keeps our factory pricing private from anonymous scraping.
          </p>

          <label className="block space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>

          <label className="block space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            WhatsApp / phone number
            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))
              }
              inputMode="numeric"
              placeholder="10-digit number"
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>

          {error && <p className="text-[11px] font-semibold text-red-700">{error}</p>}

          <button
            type="button"
            onClick={() => {
              if (name.trim().length < 2) {
                setError("Enter your name.");
                return;
              }
              if (!/^[6-9]\d{9}$/.test(phone)) {
                setError("Enter a valid 10-digit Indian mobile number.");
                return;
              }
              try {
                window.localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({ name: name.trim(), phone, at: Date.now() })
                );
              } catch {
                // Continue even if storage is blocked.
              }
              setUnlocked(true);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider"
          >
            <MessageSquare className="w-4 h-4" />
            Unlock wholesale prices
          </button>
        </div>
      </div>
    </div>
  );
}
