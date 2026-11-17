import "server-only";
import { checkSharedRateLimit } from "@/lib/rateLimit";

export const LEAD_RATE_LIMIT = 5;
export const LEAD_RATE_WINDOW_MS = 60 * 60 * 1000;
export const BULK_PRICE_RATE_LIMIT = 20;
export const BULK_PRICE_RATE_WINDOW_MS = 60 * 1000;
export const BULK_PDF_RATE_LIMIT = 5;
export const BULK_PDF_RATE_WINDOW_MS = 60 * 1000;

export async function checkLeadRateLimit(ip: string): Promise<boolean> {
  return await checkSharedRateLimit({
    scope: "b2b-lead",
    ip,
    limit: LEAD_RATE_LIMIT,
    windowMs: LEAD_RATE_WINDOW_MS,
    failClosed: false,
  });
}

export async function checkBulkPriceRateLimit(ip: string): Promise<boolean> {
  return await checkSharedRateLimit({
    scope: "bulk-price",
    ip,
    limit: BULK_PRICE_RATE_LIMIT,
    windowMs: BULK_PRICE_RATE_WINDOW_MS,
    failClosed: false,
  });
}

export async function checkBulkPdfRateLimit(ip: string): Promise<boolean> {
  return await checkSharedRateLimit({
    scope: "bulk-pdf",
    ip,
    limit: BULK_PDF_RATE_LIMIT,
    windowMs: BULK_PDF_RATE_WINDOW_MS,
    failClosed: false,
  });
}
