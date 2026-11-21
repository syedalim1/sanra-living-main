import React from "react";
import Link from "next/link";
import WatermarkedImage from "./WatermarkedImage";
import { MessageSquare } from "lucide-react";
import { whatsappHref } from "@/lib/company";

interface CategoryCardProps {
  name: string;
  imageSrc: string;
  imageAlt?: string;
  priceBadge?: string;
  description?: string;
  href?: string;
}

export default function CategoryCard({
  name,
  imageSrc,
  imageAlt,
  priceBadge,
  description,
  href = "/products",
}: CategoryCardProps) {
  const whatsappEnquiryUrl = whatsappHref(
    `Hello SANRA LIVING, I am interested in factory pricing for: ${name}.`
  );

  return (
    <div className="group bg-white rounded-lg border border-neutral-200 overflow-hidden flex flex-col hover:border-neutral-400 hover:shadow-md transition-all duration-200">
      <Link href={href} className="block relative overflow-hidden bg-neutral-100">
        <WatermarkedImage
          src={imageSrc}
          alt={imageAlt ?? name}
          aspectRatio="video"
          className="group-hover:scale-[1.02] transition-transform duration-300"
        />
        {/* Price Badge on Top Right (only when a real price exists) */}
        {priceBadge && (
          <div className="absolute top-3 right-3 z-20">
            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded bg-[#111111] text-white shadow-sm">
              {priceBadge}
            </span>
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#111111] tracking-tight group-hover:text-neutral-700 transition-colors">
            <Link href={href}>{name}</Link>
          </h3>
          {description && (
            <p className="mt-2 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
          <Link
            href={href}
            className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:underline"
          >
            View Range →
          </Link>
          <a
            href={whatsappEnquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

