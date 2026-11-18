import React from "react";

const TRUST_ITEMS = [
  "🏭 Direct SIDCO Coimbatore Factory",
  "🏆 11+ Years of Manufacturing Experience",
  "📄 GST Invoice",
  "🛡️ 10-Yr MIG Warranty",
  "🔄 3-Yr SS Replacement Guarantee",
];

export default function TrustBar() {
  return (
    <div className="bg-[#111111] text-white py-2.5 px-4 text-xs sm:text-sm font-medium border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-center leading-relaxed">
        {TRUST_ITEMS.map((item, index) => (
          <React.Fragment key={item}>
            {index > 0 && (
              <span className="hidden sm:inline text-neutral-600" aria-hidden="true">
                |
              </span>
            )}
            <span className="whitespace-nowrap">{item}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
