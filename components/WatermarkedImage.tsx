import React from "react";
import Image from "next/image";

interface WatermarkedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: "square" | "video" | "auto" | "wide";
  priority?: boolean;
}

export default function WatermarkedImage({
  src,
  alt,
  width = 800,
  height = 600,
  className = "",
  aspectRatio = "video",
  priority = false,
}: WatermarkedImageProps) {
  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "wide"
      ? "aspect-[16/9]"
      : aspectRatio === "video"
      ? "aspect-[4/3]"
      : "";

  return (
    <div
      className={`relative overflow-hidden bg-[#F5F5F7] select-none ${aspectClass} ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="w-full h-full object-cover"
      />
      {/* Centered Faint Watermark Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span
          className="text-neutral-900/15 text-xs sm:text-sm md:text-base font-extrabold tracking-[0.25em] sm:tracking-[0.35em] uppercase text-center transform -rotate-12 select-none px-4 py-1.5 border border-neutral-900/10 rounded backdrop-blur-[0.5px]"
          aria-hidden="true"
        >
          SANRA LIVING
        </span>
      </div>
    </div>
  );
}

