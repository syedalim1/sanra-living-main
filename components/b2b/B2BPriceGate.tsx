"use client";

import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Lock } from "lucide-react";

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
        // Continue with the form if storage is unavailable.
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone, at: Date.now() }));
    } catch {
      // The tools can still be opened for this visit.
    }
    setUnlocked(true);
  }

  if (unlocked) return <>{children}</>;

  return (
    <div id="calculator">
      <section id="bulk" className="sanra-trade-gate" aria-labelledby="trade-tools-heading">
        <div>
          <p className="sanra-label"><Lock size={14} aria-hidden="true" /> Trade tools</p>
          <h2 id="trade-tools-heading">Plan your room and build a bulk quote.</h2>
          <p>Use your name and WhatsApp number to open the room size calculator and wholesale pricing tools.</p>
        </div>
        <form onSubmit={unlock}>
          <label>
            Your name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </label>
          <label>
            WhatsApp or phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit number"
            />
          </label>
          {error && <p role="alert" className="text-red-800">{error}</p>}
          <button type="submit" className="sanra-button sanra-button--rust">Open trade tools</button>
        </form>
      </section>
    </div>
  );
}
