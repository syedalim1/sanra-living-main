export const MEDIA_ORIGINALS_BUCKET = "sanra-image-originals";
export const MEDIA_DERIVATIVES_BUCKET = "sanra-image-derivatives";
export const LEGACY_IMAGE_BUCKET = "product-images";
const publicPrefix = "/api/media/";
const adminPrefix = "/api/admin/media/";
const legacyPrefix = "/storage/v1/object/public/product-images/";
const legacyAuthPrefix = "/storage/v1/object/authenticated/product-images/";
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const legacyFile = /^(?:[a-z\d][a-z\d_.-]*\/){1,6}[a-z\d][a-z\d_.-]*\.(?:jpe?g|png|webp)$/i;
const managedCatalog = new RegExp("^catalog/products/(?:[A-Z0-9-]+/){1,2}[a-z0-9-]+-" + uuid + "\\.webp$");
const managedProject = new RegExp("^project/" + uuid + "/photo-" + uuid + "\\.webp$");
const orderOriginal = new RegExp("^order/orders/[A-Z0-9-]+/wip-" + uuid + "\\.webp$");

export function isLegacyImagePath(path: string) {
  return path.length <= 340 && legacyFile.test(path);
}

export function isMediaKey(key: string) {
  return managedCatalog.test(key) || managedProject.test(key) ||
    (key.startsWith("catalog/legacy/") && isLegacyImagePath(key.slice("catalog/legacy/".length)));
}

export function mediaUrl(key: string) {
  return publicPrefix + key;
}

export function mediaKeyFromUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.startsWith(publicPrefix)) return null;
  const key = value.slice(publicPrefix.length);
  return isMediaKey(key) ? key : null;
}

export function legacyImagePath(value: string | null | undefined): string | null {
  if (!value || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin) return null;
    const marker = [legacyPrefix, legacyAuthPrefix].find((prefix) => url.pathname.startsWith(prefix));
    if (!marker) return null;
    const path = decodeURIComponent(url.pathname.slice(marker.length));
    return isLegacyImagePath(path) ? path : null;
  } catch {
    return null;
  }
}

export function publicImageUrl(value: string | null | undefined) {
  if (mediaKeyFromUrl(value)) return value ?? null;
  const path = legacyImagePath(value);
  if (path) return mediaUrl("catalog/legacy/" + path);
  if (value && /^(?:\/og-default\.png|\/images\/[a-z\d-]+\.(?:svg|webp))$/.test(value)) return value;
  if (value && /^\/images\/cat-[a-z-]+\.jpg$/.test(value)) return value.replace(/\.jpg$/, ".webp");
  return null;
}

export function adminImageUrl(value: string | null | undefined) {
  const qualified = publicImageUrl(value);
  const key = mediaKeyFromUrl(qualified);
  return key ? adminPrefix + key : qualified;
}

export function isOriginalKey(key: string) {
  return isMediaKey(key) || orderOriginal.test(key);
}

export function profileForMediaKey(key: string) {
  if (key.startsWith("project/")) return "project";
  if (key.startsWith("order/")) return "order";
  return key.split("/").at(-1)?.startsWith("swatch-") ? "swatch" : "catalog";
}

export function projectIdFromMediaKey(key: string) {
  return managedProject.test(key) ? key.split("/")[1] : null;
}
