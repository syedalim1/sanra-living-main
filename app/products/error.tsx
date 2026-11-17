"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged for monitoring without exposing to UI
  }, [error]);

  return (
    <div className="bg-[#FFFFFF] min-h-[60vh] flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full text-center p-8 bg-[#F5F5F7] rounded-xl border border-neutral-200">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#111111] mb-2">
          Unable to Load Products
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 mb-6 leading-relaxed">
          We encountered an issue retrieving the live factory catalog from SIDCO. Please retry or contact our factory desk on WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#111111] hover:bg-neutral-800 text-white rounded text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
