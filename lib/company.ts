const clean = (value: string | undefined) => (value ?? "").trim();

export const BRAND_NAME = "SANRA LIVING";
export const MANUFACTURER_NAME = "Indian Make Steel Industries";
export const COMPANY_NAME = `${BRAND_NAME} | ${MANUFACTURER_NAME}`;

const DEFAULT_ADDRESS =
  "K-6, SIDCO Industrial Estate, Kurichi, Coimbatore, Tamil Nadu 641021, India.";
const DEFAULT_EMAIL = "hello@sanraliving.com";
const DEFAULT_PRIMARY_PHONE = "9585745303";
const DEFAULT_SECONDARY_PHONE = "8300904920";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeDialCode(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

function formatIndianPhone(value: string): string {
  const digits = normalizeDialCode(value);
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

function telHref(value: string): string {
  const digits = normalizeDialCode(value);
  return digits ? `tel:+${digits}` : "";
}

const address = clean(process.env.COMPANY_ADDRESS) || DEFAULT_ADDRESS;
const primaryPhoneRaw = clean(process.env.COMPANY_PHONE) || DEFAULT_PRIMARY_PHONE;
const secondaryPhoneRaw =
  clean(process.env.COMPANY_SECONDARY_PHONE) || DEFAULT_SECONDARY_PHONE;
const whatsappNumber = normalizeDialCode(
  clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) || primaryPhoneRaw
);

export const company = {
  brand: BRAND_NAME,
  manufacturer: MANUFACTURER_NAME,
  name: COMPANY_NAME,
  address,
  email: clean(process.env.COMPANY_EMAIL) || DEFAULT_EMAIL,
  gstin: clean(process.env.COMPANY_GSTIN).toUpperCase(),
  phone: formatIndianPhone(primaryPhoneRaw),
  phoneHref: telHref(primaryPhoneRaw),
  phoneDial: normalizeDialCode(primaryPhoneRaw),
  secondaryPhone: formatIndianPhone(secondaryPhoneRaw),
  secondaryPhoneHref: telHref(secondaryPhoneRaw),
  whatsappNumber,
  whatsappDisplayNumber: formatIndianPhone(whatsappNumber),
  mapsUrl:
    clean(process.env.GOOGLE_MAPS_URL) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
};

export const SOCIAL = {
  instagram: "https://www.instagram.com/indian_make__steel",
  facebook: "https://www.facebook.com/share/1e7Tuz8iKd/",
  google_maps: clean(process.env.GOOGLE_MAPS_URL),
};

export const WORKING_HOURS = "Monday to Saturday, 9:00 AM – 7:00 PM IST";

export const GST_NOTE = "As applicable; GST invoice will be provided";

export const WARRANTY_TERMS =
  "SANRA LIVING warrants the structural steel frame against manufacturing defects for the warranty period stated on this certificate. This warranty is limited to repair or replacement of the affected structural component.";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hi SANRA LIVING, I'd like to know more about your steel furniture.";

export function whatsappHref(
  text: string,
  number: string = company.whatsappNumber
): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
