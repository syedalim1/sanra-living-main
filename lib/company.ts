const clean = (value: string | undefined) => (value ?? "").trim();

const whatsappNumber = clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER).replace(/\D/g, "");

export const company = {
  whatsappNumber,
  whatsappDisplayNumber: whatsappNumber || "UPDATE ME",
  address: clean(process.env.COMPANY_ADDRESS) || "UPDATE ME — Set COMPANY_ADDRESS in .env.local",
  gstin: clean(process.env.COMPANY_GSTIN) || "UPDATE ME — Set COMPANY_GSTIN in .env.local",
  phone: clean(process.env.COMPANY_PHONE) || "UPDATE ME — Set COMPANY_PHONE in .env.local",
};

export const WORKING_HOURS = "Monday to Saturday, 9:00 AM – 7:00 PM IST";

export const GST_NOTE = "As applicable; GST invoice will be provided";

export const WARRANTY_TERMS =
  "SANRA LIVING warrants the structural steel frame against manufacturing defects for the warranty period stated on this certificate. This warranty is limited to repair or replacement of the affected structural component.";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hi SANRA LIVING, I'd like to know more about your steel furniture.";

export function whatsappHref(text: string, number: string = company.whatsappNumber): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
