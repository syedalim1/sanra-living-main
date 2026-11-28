export const ENQUIRY_BASKET_KEY = "sanra_enquiry_basket";
export const ENQUIRY_BASKET_EVENT = "sanra-enquiry-updated";

export interface EnquiryBasketItem {
  sku: string;
  name: string;
  variant_id: string;
  variant_code: string;
  frame_material: string;
  build_category: string;
  surface: string | null;
  size: string;
  quantity: number;
  product_url: string;
  added_at: string;
}

export function readEnquiryBasket(): EnquiryBasketItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ENQUIRY_BASKET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EnquiryBasketItem[]) : [];
  } catch {
    return [];
  }
}

export function writeEnquiryBasket(items: EnquiryBasketItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENQUIRY_BASKET_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(ENQUIRY_BASKET_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function addEnquiryItem(item: EnquiryBasketItem): void {
  const current = readEnquiryBasket();
  const idx = current.findIndex((x) => x.variant_id === item.variant_id);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      quantity: Math.min(10_000, current[idx].quantity + item.quantity),
      added_at: item.added_at,
    };
  } else {
    current.push(item);
  }
  writeEnquiryBasket(current);
}
