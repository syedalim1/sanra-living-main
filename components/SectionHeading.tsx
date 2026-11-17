import React from "react";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
}

export default function SectionHeading({
  badge,
  title,
  subtitle,
  align = "center",
  as: Heading = "h2",
}: SectionHeadingProps) {
  const alignmentClass = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`flex flex-col mb-10 md:mb-14 ${alignmentClass}`}>
      {badge && (
        <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-200/80 px-3 py-1 rounded-full mb-3">
          {badge}
        </span>
      )}
      <Heading className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight max-w-3xl leading-tight">
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-3 text-sm sm:text-base text-neutral-600 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

