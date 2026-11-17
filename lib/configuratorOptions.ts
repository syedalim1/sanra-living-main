export interface ConfigOption {
  id?: string;
  option_group: string;
  option_code: string;
  parent_code?: string | null;
  label_en: string;
  group_label?: string | null;
  swatch_color_hex?: string | null;
  swatch_texture_img?: string | null;
  spec_note?: string | null;
  load_kg?: number | null;
  warranty_text?: string | null;
  badge_text?: string | null;
  sort_order?: number;
}

export const FALLBACK_OPTIONS: ConfigOption[] = [
  // TOP_TAB
  { option_group: "TOP_TAB", option_code: "FRAME_ONLY", label_en: "Frame Only", sort_order: 10 },
  { option_group: "TOP_TAB", option_code: "WOOD", label_en: "Wood Tops", sort_order: 20 },
  { option_group: "TOP_TAB", option_code: "STONE", label_en: "Granite & Marble Tops", sort_order: 30 },
  { option_group: "TOP_TAB", option_code: "METAL", label_en: "Industrial Metal Top", sort_order: 40 },

  // TOP_MATERIAL - WOOD
  {
    option_group: "TOP_MATERIAL",
    option_code: "RUBBER_HONEY_TEAK",
    parent_code: "WOOD",
    label_en: "Natural Honey Teak Polish",
    group_label: "Solid Kerala Rubberwood (18mm Finger-Jointed)",
    swatch_color_hex: "#C28B38",
    sort_order: 101,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "RUBBER_DARK_WALNUT",
    parent_code: "WOOD",
    label_en: "Dark Walnut Luxury Polish",
    group_label: "Solid Kerala Rubberwood (18mm Finger-Jointed)",
    swatch_color_hex: "#4A2A18",
    sort_order: 102,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "RUBBER_CLEAR_MATTE",
    parent_code: "WOOD",
    label_en: "Clear Matte Natural Wood",
    group_label: "Solid Kerala Rubberwood (18mm Finger-Jointed)",
    swatch_color_hex: "#D8BA84",
    sort_order: 103,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "PRELAM_WHITE",
    parent_code: "WOOD",
    label_en: "Frosty Corporate White",
    group_label: "IT Office Pre-Lam Board (25mm + 2mm PVC Edge)",
    swatch_color_hex: "#F8FAFC",
    sort_order: 104,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "PRELAM_CARBON_BLACK",
    parent_code: "WOOD",
    label_en: "Matte Carbon Black",
    group_label: "IT Office Pre-Lam Board (25mm + 2mm PVC Edge)",
    swatch_color_hex: "#1E293B",
    sort_order: 105,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "PRELAM_LIGHT_OAK",
    parent_code: "WOOD",
    label_en: "Light Oak Woodgrain",
    group_label: "IT Office Pre-Lam Board (25mm + 2mm PVC Edge)",
    swatch_color_hex: "#D4B996",
    sort_order: 106,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "PRELAM_COLUMBIA_WALNUT",
    parent_code: "WOOD",
    label_en: "Columbia Dark Walnut",
    group_label: "IT Office Pre-Lam Board (25mm + 2mm PVC Edge)",
    swatch_color_hex: "#5D4037",
    sort_order: 107,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "BWR_WARM_TEAK",
    parent_code: "WOOD",
    label_en: "Cafe Warm Teak Mica",
    group_label: "BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)",
    swatch_color_hex: "#9E6B40",
    sort_order: 108,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "BWR_CONCRETE_GREY",
    parent_code: "WOOD",
    label_en: "Concrete Loft Grey Mica",
    group_label: "BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)",
    swatch_color_hex: "#78909C",
    sort_order: 109,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "WPC_TEAK_BROWN",
    parent_code: "WOOD",
    label_en: "Weatherproof Teak Brown",
    group_label: "Outdoor WPC Solid Planks (100% Waterproof)",
    swatch_color_hex: "#5C4033",
    sort_order: 110,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "WPC_CHARCOAL_GREY",
    parent_code: "WOOD",
    label_en: "Charcoal Grey",
    group_label: "Outdoor WPC Solid Planks (100% Waterproof)",
    swatch_color_hex: "#2F3538",
    sort_order: 111,
  },

  // TOP_MATERIAL - STONE
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_JET_BLACK_OPT",
    parent_code: "STONE",
    label_en: "Absolute Jet Black",
    group_label: "Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)",
    swatch_color_hex: "#0A0A0A",
    sort_order: 201,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_GALAXY_OPT",
    parent_code: "STONE",
    label_en: "Black Galaxy",
    group_label: "Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)",
    swatch_color_hex: "#1C1C1E",
    sort_order: 202,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_KWHITE_OPT",
    parent_code: "STONE",
    label_en: "K-White / Colonial White",
    group_label: "Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)",
    swatch_color_hex: "#F1F5F9",
    sort_order: 203,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_RED_OPT",
    parent_code: "STONE",
    label_en: "Ruby Red",
    group_label: "Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)",
    swatch_color_hex: "#7F1D1D",
    sort_order: 204,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_TAN_BROWN_OPT",
    parent_code: "STONE",
    label_en: "Tan Brown",
    group_label: "Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)",
    swatch_color_hex: "#451A03",
    sort_order: 205,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "QUARTZ_CARRARA",
    parent_code: "STONE",
    label_en: "Italian Carrara White Marble Look",
    group_label: "Luxury Marble / Quartz Finish (18mm)",
    swatch_color_hex: "#F8FAFC",
    sort_order: 206,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "QUARTZ_NERO_MARQUINA",
    parent_code: "STONE",
    label_en: "Nero Marquina Black Marble Look",
    group_label: "Luxury Marble / Quartz Finish (18mm)",
    swatch_color_hex: "#0F172A",
    sort_order: 207,
  },

  // TOP_MATERIAL - METAL
  {
    option_group: "TOP_MATERIAL",
    option_code: "SHEET_PERFORATED_OPT",
    parent_code: "METAL",
    label_en: "Perforated Sheet Top",
    group_label: "Industrial Steel Tops",
    swatch_color_hex: "#334155",
    sort_order: 301,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "SHEET_MESH_OPT",
    parent_code: "METAL",
    label_en: "Expanded Diamond Mesh Top",
    group_label: "Industrial Steel Tops",
    swatch_color_hex: "#475569",
    sort_order: 302,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "SHEET_CR_16G_OPT",
    parent_code: "METAL",
    label_en: "16G Solid CR Sheet Top",
    group_label: "Industrial Steel Tops",
    swatch_color_hex: "#1E293B",
    sort_order: 303,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "SHEET_SS304_OPT",
    parent_code: "METAL",
    label_en: "Jindal SS 304 Food-Grade Sheet Top",
    group_label: "Industrial Steel Tops",
    swatch_color_hex: "#E2E8F0",
    sort_order: 304,
  },

  // GAUGE
  {
    option_group: "GAUGE",
    option_code: "G18",
    label_en: "18 Gauge Economy (1.2mm Tata/Apollo CR)",
    load_kg: 150,
    warranty_text: "7 Years Weld Warranty",
    spec_note: "Home & office use",
    sort_order: 1,
  },
  {
    option_group: "GAUGE",
    option_code: "G16",
    label_en: "16 Gauge Heavy Commercial (1.6mm Tata Structura)",
    load_kg: 250,
    warranty_text: "10 Years Structural MIG Warranty",
    badge_text: "Recommended",
    spec_note: "Cafe, hotel, IT office",
    sort_order: 2,
  },
  {
    option_group: "GAUGE",
    option_code: "G14",
    label_en: "14 Gauge Extra-Heavy Industrial (2.0mm)",
    load_kg: 400,
    warranty_text: "15 Years Warranty",
    spec_note: "College, hostel, factory",
    sort_order: 3,
  },
  {
    option_group: "GAUGE",
    option_code: "SS202",
    label_en: "Jindal SS 202 (Indoor Luxury)",
    load_kg: 200,
    warranty_text: "10 Years Weld Warranty",
    spec_note: "Indoor luxury styling",
    sort_order: 4,
  },
  {
    option_group: "GAUGE",
    option_code: "SS304",
    label_en: "Jindal SS 304 (100% Rust-Proof + Argon TIG)",
    load_kg: 300,
    warranty_text: "3-Year Free Replacement Guarantee + 15 Years Rust-Free Warranty",
    spec_note: "Food & sanitary grade",
    sort_order: 5,
  },

  // FRAME_COLOR
  { option_group: "FRAME_COLOR", option_code: "MATTE_BLACK", label_en: "Matte Black Powder Coated", swatch_color_hex: "#111111", sort_order: 1 },
  { option_group: "FRAME_COLOR", option_code: "WHITE", label_en: "Pure White Coated", swatch_color_hex: "#FFFFFF", sort_order: 2 },
  { option_group: "FRAME_COLOR", option_code: "GREY", label_en: "Industrial Grey", swatch_color_hex: "#4B5563", sort_order: 3 },
  { option_group: "FRAME_COLOR", option_code: "RAW", label_en: "Raw Primed", swatch_color_hex: "#9CA3AF", sort_order: 4 },
  { option_group: "FRAME_COLOR", option_code: "GOLD", label_en: "Gold", swatch_color_hex: "#D4AF37", sort_order: 5 },

  // BUILD_TYPE
  {
    option_group: "BUILD_TYPE",
    option_code: "WELDED",
    label_en: "100% Factory Welded (Coimbatore Local Delivery)",
    spec_note: "Pre-assembled on surface plate. 0-min setup.",
    sort_order: 1,
  },
  {
    option_group: "BUILD_TYPE",
    option_code: "KNOCKDOWN",
    label_en: "5-Min Flat-Pack Knock-Down (Pan-India Courier)",
    spec_note: "Telescopic zero-shake lock. Dispatches nationwide.",
    sort_order: 2,
  },

  // SIZE
  { option_group: "SIZE", option_code: "2x2", label_en: "2 x 2 ft", spec_note: "Compact side or single cafe table", sort_order: 1 },
  { option_group: "SIZE", option_code: "3x2", label_en: "3 x 2 ft", spec_note: "Standard 2-seater cafe table", sort_order: 2 },
  { option_group: "SIZE", option_code: "4x2", label_en: "4 x 2 ft", spec_note: "Standard 4-seater cafe or compact desk", sort_order: 3 },
  { option_group: "SIZE", option_code: "4x2.5", label_en: "4 x 2.5 ft", spec_note: "Spacious executive IT workstation", sort_order: 4 },
  { option_group: "SIZE", option_code: "6x3", label_en: "6 x 3 ft", spec_note: "Large 6-seater dining or conference table", sort_order: 5 },
  { option_group: "SIZE", option_code: "CUSTOM", label_en: "Custom Size Request", spec_note: "Engineered to your exact site millimeter dimensions", sort_order: 6 },

  // ADDON
  { option_group: "ADDON", option_code: "GROMMET", label_en: "+ ₹50 Laptop Wire Grommet Hole", spec_note: "Precision CNC circular cable portal with brush cap", sort_order: 1 },
  { option_group: "ADDON", option_code: "CPU_HOLDER", label_en: "+ ₹150 Under-Table CPU / Bag Holder", spec_note: "Heavy-gauge steel suspended cradle for tower / backpacks", sort_order: 2 },
  { option_group: "ADDON", option_code: "CHAIRS4", label_en: "+ ₹600 Add 4 Matching Chairs Combo", spec_note: "Matching structural steel frame chairs with bumper feet", sort_order: 3 },

  // QTY_TIER
  { option_group: "QTY_TIER", option_code: "TIER_1_3", label_en: "1-3 Pcs (Retail Price)", spec_note: "Direct factory price with GST invoice", sort_order: 1 },
  { option_group: "QTY_TIER", option_code: "TIER_4_9", label_en: "4-9 Pcs (5% Small Biz Discount)", spec_note: "5% factory rebate applied automatically", sort_order: 2 },
  { option_group: "QTY_TIER", option_code: "TIER_10_PLUS", label_en: "10+ Pcs (12% B2B Factory Wholesale Discount)", spec_note: "12% direct volume bulk pricing", sort_order: 3 },
];

