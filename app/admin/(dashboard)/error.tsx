"use client";

import { AlertTriangle } from "lucide-react";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto mt-16">
      <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-red-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold">Something went wrong.</p>
            <p className="text-xs leading-relaxed">
              The admin request could not be completed. Please retry. If it keeps failing, check
              the server logs and the Supabase environment.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 px-3.5 py-2 rounded-md bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
