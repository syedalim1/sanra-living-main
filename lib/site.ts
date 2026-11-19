export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sanraliving.com"
).replace(/\/+$/, "");

export const SITE_NAME = "SANRA LIVING";

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function productPath(sku: string): string {
  return `/products/${sku.toLowerCase()}`;
}

export function productUrl(sku: string): string {
  return absoluteUrl(productPath(sku));
}
