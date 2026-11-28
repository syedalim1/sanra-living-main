"use client";

import { useEffect } from "react";
import Script from "next/script";
import { captureAttribution } from "@/lib/analytics";

export default function AnalyticsTracker({ gaId }: { gaId?: string }) {
  useEffect(() => {
    captureAttribution();
  }, []);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
      />
      <Script id="sanra-ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
