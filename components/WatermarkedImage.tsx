"use client";

import { useState } from "react";
import Image from "next/image";
import PlaceholderImage from "./PlaceholderImage";
import { mediaKeyFromUrl, publicImageUrl } from "@/lib/media/paths";

interface WatermarkedImageProps {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: "square" | "video" | "auto" | "wide";
  priority?: boolean;
  sizes?: string;
}

const aspectClasses = { square: "aspect-square", wide: "aspect-video", video: "aspect-[4/3]", auto: "" };

export default function WatermarkedImage({
  src,
  fallbackSrc,
  alt,
  width = 800,
  height = 600,
  className = "",
  aspectRatio = "video",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: WatermarkedImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [failedFallback, setFailedFallback] = useState<string | null>(null);
  const primary = publicImageUrl(src);
  const fallback = publicImageUrl(fallbackSrc);
  const current = primary && primary !== failedSrc
    ? primary
    : fallback && fallback !== failedFallback && fallback !== primary ? fallback : null;

  if (!current) return <PlaceholderImage aspectRatio={aspectRatio} className={className} label={alt} />;

  const protectedPhoto = Boolean(mediaKeyFromUrl(current));

  return (
    <div className={"relative overflow-hidden bg-[#F5F5F7] select-none " + aspectClasses[aspectRatio] + " " + className}>
      <picture>
        {protectedPhoto && <source media="(max-width: 760px)" srcSet={current + "?size=mobile"} />}
        <Image
          src={current}
          alt={alt}
          width={width}
          height={height}
          preload={priority && !protectedPhoto}
          fetchPriority={priority && protectedPhoto ? "high" : undefined}
          loading={priority && protectedPhoto ? "eager" : undefined}
          sizes={sizes}
          unoptimized={protectedPhoto}
          className="w-full h-full object-cover"
          onError={() => current === primary ? setFailedSrc(primary) : setFailedFallback(current)}
        />
      </picture>
    </div>
  );
}
