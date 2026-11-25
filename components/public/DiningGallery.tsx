"use client";

import { useState } from "react";
import Image from "next/image";

const views = [
  { label: "Full set", alt: "Six stainless steel and wood chairs around a dark granite dining table" },
  { label: "Frame detail", alt: "Detail of the stainless steel table frame and wood chair seats" },
];

export default function DiningGallery({ src }: { src: string }) {
  const [activeView, setActiveView] = useState(0);

  return (
    <figure className="sanra-gallery">
      <div className="sanra-gallery-image" id="dining-gallery-image" data-view={activeView}>
        <Image
          src={src}
          alt={views[activeView].alt}
          fill
          sizes="(max-width: 760px) 92vw, 48vw"
        />
      </div>
      <figcaption className="sanra-gallery-bar">
        <span className="sanra-label">SS frame · Granite top</span>
        <div role="group" aria-label="Dining set views">
          {views.map(({ label }, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={activeView === index}
              aria-controls="dining-gallery-image"
              onClick={() => setActiveView(index)}
            >
              {label}
            </button>
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
