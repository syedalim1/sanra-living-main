"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

const DEFAULT_MESSAGE =
  "Hi SANRA LIVING, I'd like to know more about your steel furniture.";

interface FloatingWhatsAppProps {
  whatsappNumber: string;
}

export default function FloatingWhatsApp({ whatsappNumber }: FloatingWhatsAppProps) {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "0px 0px 96px 0px" }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (footerVisible) return null;
  const base = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "https://wa.me/";
  const href = `${base}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SANRA LIVING on WhatsApp"
      className="site-floating-whatsapp fixed right-4 bottom-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 transition-colors"
    >
      <MessageSquare className="w-6 h-6" />
    </a>
  );
}
