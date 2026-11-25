"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProjectGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const source = images[index];
  const caption = "Photo " + (index + 1) + " of " + images.length;

  return (
    <figure className="sanra-project-gallery">
      <div className="sanra-project-photo">
        <picture key={source}>
          <source media="(max-width: 760px)" srcSet={source + "?size=mobile"} />
          <Image fill unoptimized src={source} alt={title + ", " + caption.toLowerCase()} sizes="(max-width: 760px) 90vw, 55vw" />
        </picture>
      </div>
      {images.length > 1 && (
        <figcaption>
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous photo">
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <span aria-live="polite">{caption}</span>
          <button type="button" disabled={index === images.length - 1} onClick={() => setIndex(index + 1)} aria-label="Next photo">
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </figcaption>
      )}
    </figure>
  );
}
