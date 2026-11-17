"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

const DEFAULT_MESSAGE =
  "Hi SANRA LIVING, I'd like to know more about your steel furniture.";

interface FloatingWhatsAppProps {
  whatsappNumber: string;
}

export default function FloatingWhatsApp({ whatsappNumber }: FloatingWhatsAppProps) {
  const pathname = usePathname();
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

  if (pathname.startsWith("/admin") || footerVisible) return null;

  const isConfigurator = pathname.startsWith("/products/");
  const base = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "https://wa.me/";
  const href = `${base}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SANRA LIVING on WhatsApp"
      className={`fixed right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors ${
        isConfigurator ? "bottom-24 sm:bottom-6" : "bottom-6"
      }`}
    >
      <MessageSquare className="w-6 h-6" />
    </a>
  );
}
