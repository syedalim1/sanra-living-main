import { ImageOff } from "lucide-react";

interface PlaceholderImageProps {
  aspectRatio?: "square" | "video" | "wide" | "auto";
  className?: string;
  label?: string;
  fill?: boolean;
}

export default function PlaceholderImage({
  aspectRatio = "video",
  className = "",
  label = "Image unavailable",
  fill = false,
}: PlaceholderImageProps) {
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
      role="img"
      aria-label={label}
      className={`flex items-center justify-center bg-[#F5F5F7] border border-neutral-200 overflow-hidden ${
        fill ? "absolute inset-0" : `relative ${aspectClass}`
      } ${className}`}
    >
      <ImageOff className="w-8 h-8 text-neutral-400" aria-hidden="true" />
    </div>
  );
}
