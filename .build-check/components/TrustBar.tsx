import React from "react";

export default function TrustBar() {
  return (
    <div className="bg-[#111111] text-white py-2.5 px-4 text-xs sm:text-sm font-medium border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-center leading-relaxed">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span>🏭</span> Direct SIDCO Coimbatore Factory
        </span>
        <span className="hidden sm:inline text-neutral-600">•</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span>📄</span> GST Invoice
        </span>
        <span className="hidden sm:inline text-neutral-600">•</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span>🛡️</span> 10-Yr MIG Warranty
        </span>
        <span className="hidden sm:inline text-neutral-600">•</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span>🔄</span> 3-Yr SS Replacement Guarantee
        </span>
      </div>
    </div>
  );
}

