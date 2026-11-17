interface RateEntry {
  count: number;
  resetTime: number;
}

const leadAttempts = new Map<string, RateEntry>();
const bulkPriceAttempts = new Map<string, RateEntry>();
const bulkPdfAttempts = new Map<string, RateEntry>();

function check(
  store: Map<string, RateEntry>,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export const LEAD_RATE_LIMIT = 5;
export const LEAD_RATE_WINDOW_MS = 60 * 60 * 1000;
export const BULK_PRICE_RATE_LIMIT = 20;
export const BULK_PRICE_RATE_WINDOW_MS = 60 * 1000;
export const BULK_PDF_RATE_LIMIT = 5;
export const BULK_PDF_RATE_WINDOW_MS = 60 * 1000;

export function checkLeadRateLimit(ip: string): boolean {
  return check(leadAttempts, ip, LEAD_RATE_LIMIT, LEAD_RATE_WINDOW_MS);
}

export function checkBulkPriceRateLimit(ip: string): boolean {
  return check(
    bulkPriceAttempts,
    ip,
    BULK_PRICE_RATE_LIMIT,
    BULK_PRICE_RATE_WINDOW_MS
  );
}

export function checkBulkPdfRateLimit(ip: string): boolean {
  return check(bulkPdfAttempts, ip, BULK_PDF_RATE_LIMIT, BULK_PDF_RATE_WINDOW_MS);
}

export function resetB2bRateLimitsForTests(): void {
  leadAttempts.clear();
  bulkPriceAttempts.clear();
  bulkPdfAttempts.clear();
}
