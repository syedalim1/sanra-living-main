export type AnalyticsEventName =
  | "view_item"
  | "product_enquiry"
  | "whatsapp_click"
  | "call_click"
  | "quote_submit"
  | "sample_request"
  | "catalog_download"
  | "directions_click";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const ATTRIBUTION_KEY = "sanra_utm_attribution";

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_page?: string;
}

export function captureAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (existing) return JSON.parse(existing) as AttributionData;

    const params = new URLSearchParams(window.location.search);
    const data: AttributionData = {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      referrer: document.referrer || undefined,
      landing_page: window.location.pathname,
    };
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

/**
 * Sends a privacy-safe analytics event to GA4 if configured.
 * Never transmits PII, manufacturing costs, or private business data.
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    const attr = captureAttribution();
    window.gtag("event", eventName, {
      ...params,
      ...(attr?.utm_source ? { utm_source: attr.utm_source } : {}),
      ...(attr?.landing_page ? { landing_page: attr.landing_page } : {}),
    });
  } catch {
    // Non-fatal
  }
}
