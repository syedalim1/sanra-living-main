const clean = (value: string | undefined) => (value ?? "").trim();

const whatsappNumber = clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER).replace(/\D/g, "");

export const company = {
  whatsappNumber,
  whatsappDisplayNumber: whatsappNumber || "UPDATE ME",
  address: clean(process.env.COMPANY_ADDRESS) || "UPDATE ME — Set COMPANY_ADDRESS in .env.local",
  gstin: clean(process.env.COMPANY_GSTIN) || "UPDATE ME — Set COMPANY_GSTIN in .env.local",
  phone: clean(process.env.COMPANY_PHONE) || "UPDATE ME — Set COMPANY_PHONE in .env.local",
};

export const GST_NOTE = "As applicable; GST invoice will be provided";

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hi SANRA LIVING, I'd like to know more about your steel furniture.";

export function whatsappHref(text: string, number: string = company.whatsappNumber): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
