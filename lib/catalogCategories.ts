export const PRODUCT_CATEGORY_OPTIONS = [
  { value: "Cafe & Dining Tables", label: "Cafe & Dining Tables" },
  { value: "Office & Workstation Tables", label: "Office & Workstations" },
  { value: "SS & MS Chairs / Bar Stools", label: "Chairs & Bar Stools" },
  { value: "Home Utility Stands", label: "Home Utility Stands" },
  { value: "Boutique & Showroom Racks", label: "Showroom Racks" },
  { value: "Hospital, Canteen & Lab SS", label: "Hospital & Lab SS" },
  { value: "Combo & Dining Sets", label: "Combo & Dining Sets" },
  { value: "Hostel & Institutional", label: "Hostel & Institutional" },
] as const;

export const CUSTOM_CATEGORY_VALUE = "__CUSTOM__";
export const CUSTOM_PRODUCT_TYPE_VALUE = "CUSTOM";

export const PRODUCT_CATEGORIES = PRODUCT_CATEGORY_OPTIONS.map(
  (option) => option.value
);
