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
    group_label: "100% Seasoned Grade-A Hardwood",
    swatch_color_hex: "#C28B38",
    sort_order: 101,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "RUBBER_DARK_WALNUT",
    parent_code: "WOOD",
    label_en: "Dark Walnut Luxury Polish",
    group_label: "100% Seasoned Grade-A Hardwood",
    swatch_color_hex: "#4A2A18",
    sort_order: 102,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "RUBBER_CLEAR_MATTE",
    parent_code: "WOOD",
    label_en: "Clear Matte Natural Wood",
    group_label: "100% Seasoned Grade-A Hardwood",
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
    group_label: "18mm Export-Grade Natural Granite",
    swatch_color_hex: "#0A0A0A",
    sort_order: 201,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_GALAXY_OPT",
    parent_code: "STONE",
    label_en: "Black Galaxy",
    group_label: "18mm Export-Grade Natural Granite",
    swatch_color_hex: "#1C1C1E",
    sort_order: 202,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_KWHITE_OPT",
    parent_code: "STONE",
    label_en: "Classic Pearl White Granite",
    group_label: "18mm Export-Grade Natural Granite",
    swatch_color_hex: "#F1F5F9",
    sort_order: 203,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_RED_OPT",
    parent_code: "STONE",
    label_en: "Ruby Red",
    group_label: "18mm Export-Grade Natural Granite",
    swatch_color_hex: "#7F1D1D",
    sort_order: 204,
  },
  {
    option_group: "TOP_MATERIAL",
    option_code: "GRANITE_TAN_BROWN_OPT",
    parent_code: "STONE",
    label_en: "Tan Brown",
    group_label: "18mm Export-Grade Natural Granite",
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
    label_en: "Stainless Steel 304 Food-Grade Sheet Top",
    group_label: "Industrial Steel Tops",
    swatch_color_hex: "#E2E8F0",
    sort_order: 304,
  },

  // GAUGE
  {
    option_group: "GAUGE",
    option_code: "G18",
    label_en: "18 Gauge Economy (Premium CR steel pipe)",
    load_kg: 150,
    warranty_text: "7 Years Weld Warranty",
    spec_note: "Home & office use",
    sort_order: 1,
  },
  {
    option_group: "GAUGE",
    option_code: "G16",
    label_en: "16 Gauge Heavy Commercial (Premium CR steel pipe)",
    load_kg: 250,
    warranty_text: "10 Years Structural MIG Warranty",
    badge_text: "Recommended",
    spec_note: "Cafe, hotel, IT office",
    sort_order: 2,
  },
  {
    option_group: "GAUGE",
    option_code: "G14",
    label_en: "14 Gauge Extra-Heavy Industrial",
    load_kg: 400,
    warranty_text: "15 Years Warranty",
    spec_note: "College, hostel, factory",
    sort_order: 3,
  },
  {
    option_group: "GAUGE",
    option_code: "SS202",
    label_en: "Stainless Steel 202 (Indoor)",
    load_kg: 200,
    warranty_text: "10 Years Weld Warranty",
    spec_note: "Indoor luxury styling",
    sort_order: 4,
  },
  {
    option_group: "GAUGE",
    option_code: "SS304",
    label_en: "Stainless Steel 304 (Food Grade)",
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
    spec_note: "Pre-assembled at the factory.",
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
  { option_group: "SIZE", option_code: "CUSTOM", label_en: "Custom Size Request", spec_note: "Made to your exact size", sort_order: 6 },

  // ADDON
  { option_group: "ADDON", option_code: "GROMMET", label_en: "+ ₹50 Laptop Wire Grommet Hole", spec_note: "Clean circular cable portal with brush cap", sort_order: 1 },
  { option_group: "ADDON", option_code: "CPU_HOLDER", label_en: "+ ₹150 Under-Table CPU / Bag Holder", spec_note: "Heavy-gauge steel suspended cradle for tower / backpacks", sort_order: 2 },
  { option_group: "ADDON", option_code: "CHAIRS4", label_en: "+ ₹600 Add 4 Matching Chairs Combo", spec_note: "Matching structural steel frame chairs with bumper feet", sort_order: 3 },

  // CHAIR - METAL_TYPE
  {
    option_group: "METAL_TYPE",
    option_code: "MS_COATED",
    label_en: "MS Powder Coated (Premium CR steel pipe)",
    swatch_color_hex: "#111111",
    warranty_text: "7 Years Weld Warranty",
    spec_note: "Durable powder-coated MS frame",
    sort_order: 1,
  },
  {
    option_group: "METAL_TYPE",
    option_code: "SS202",
    label_en: "Stainless Steel 202 (Indoor)",
    swatch_color_hex: "#D1D1D6",
    warranty_text: "10 Years Weld Warranty",
    badge_text: "Indoor Luxury",
    spec_note: "Indoor stainless styling",
    sort_order: 2,
  },
  {
    option_group: "METAL_TYPE",
    option_code: "SS304",
    label_en: "Stainless Steel 304 (Food Grade)",
    swatch_color_hex: "#E5E5EA",
    warranty_text: "3-Year Free Replacement + 15 Years Rust-Free Warranty",
    badge_text: "Rust-Proof",
    spec_note: "Food and sanitary grade",
    sort_order: 3,
  },

  // CHAIR - SEAT
  {
    option_group: "SEAT",
    option_code: "SEAT_RUBBER",
    label_en: "Solid Kerala Rubberwood Seat (100% Seasoned Grade-A)",
    swatch_color_hex: "#C29B38",
    spec_note: "100% seasoned Grade-A rubberwood",
    sort_order: 1,
  },
  {
    option_group: "SEAT",
    option_code: "SEAT_REXINE",
    label_en: "40-Density Cushion Seat with Rexine",
    swatch_color_hex: "#222222",
    spec_note: "Cushioned comfort seat",
    sort_order: 2,
  },
  {
    option_group: "SEAT",
    option_code: "SEAT_PERFORATED",
    label_en: "Perforated Metal Seat",
    swatch_color_hex: "#334155",
    spec_note: "Ventilated industrial steel seat",
    sort_order: 3,
  },

  // CHAIR - SEAT_COLOR
  { option_group: "SEAT_COLOR", option_code: "REXINE_BLACK", label_en: "Black", swatch_color_hex: "#111111", sort_order: 1 },
  { option_group: "SEAT_COLOR", option_code: "REXINE_TAN", label_en: "Tan Brown", swatch_color_hex: "#8B5E3C", sort_order: 2 },
  { option_group: "SEAT_COLOR", option_code: "REXINE_CHERRY", label_en: "Cherry Red", swatch_color_hex: "#7F1D1D", sort_order: 3 },

  // STAND
  {
    option_group: "STAND_MATERIAL",
    option_code: "ST_MS",
    label_en: "18G MS Matte Black",
    swatch_color_hex: "#111111",
    spec_note: "Powder-coated mild steel",
    sort_order: 1,
  },
  {
    option_group: "STAND_MATERIAL",
    option_code: "ST_SS304",
    label_en: "Stainless Steel 304",
    swatch_color_hex: "#E5E5EA",
    spec_note: "Rust-proof stainless steel",
    badge_text: "Rust-Proof",
    sort_order: 2,
  },
  {
    option_group: "PACK",
    option_code: "PACK_1",
    label_en: "Single Pack",
    spec_note: "One complete stand",
    sort_order: 1,
  },
  {
    option_group: "PACK",
    option_code: "PACK_2",
    label_en: "Pack of 2 Nesting Combo (Save ₹150!)",
    spec_note: "Two stands, nesting space-saving design",
    badge_text: "Save ₹150",
    sort_order: 2,
  },
  {
    option_group: "BASE",
    option_code: "BASE_BUSH",
    label_en: "Heavy Leveling Feet",
    spec_note: "Stable leveling feet",
    sort_order: 1,
  },
  {
    option_group: "BASE",
    option_code: "BASE_CASTOR",
    label_en: "Lockable Castor Wheels",
    spec_note: "Easy to move and lock in place",
    sort_order: 2,
  },

  // RACK
  { option_group: "FINISH", option_code: "RF_BLACK", label_en: "Matte Black", swatch_color_hex: "#111111", spec_note: "Powder-coated matte black", sort_order: 1 },
  { option_group: "FINISH", option_code: "RF_GOLD_PAINT", label_en: "Metallic Gold Paint", swatch_color_hex: "#D4AF37", spec_note: "Metallic gold paint finish", sort_order: 2 },
  { option_group: "FINISH", option_code: "RF_GOLD_PVD", label_en: "Rose-Gold / Gold Stainless Steel", swatch_color_hex: "#B76E79", spec_note: "Gold stainless finish", sort_order: 3 },
  { option_group: "SHELF", option_code: "SH_NONE", label_en: "No Shelf", spec_note: "Open frame", sort_order: 1 },
  { option_group: "SHELF", option_code: "SH_RUBBER", label_en: "Rubberwood Shelf", swatch_color_hex: "#C29B38", spec_note: "Solid Kerala rubberwood", sort_order: 2 },
  { option_group: "SHELF", option_code: "SH_PRELAM_WHITE", label_en: "Pre-Lam White Shelf", swatch_color_hex: "#F8FAFC", spec_note: "White engineered board", sort_order: 3 },
  { option_group: "SHELF", option_code: "SH_PRELAM_BLACK", label_en: "Pre-Lam Black Shelf", swatch_color_hex: "#1E293B", spec_note: "Black engineered board", sort_order: 4 },
  { option_group: "RACK_SIZE", option_code: "R4", label_en: "4 ft", spec_note: "Compact height & length", sort_order: 1 },
  { option_group: "RACK_SIZE", option_code: "R5", label_en: "5 ft", spec_note: "Mid height & length", sort_order: 2 },
  { option_group: "RACK_SIZE", option_code: "R6", label_en: "6 ft", spec_note: "Full height & length", sort_order: 3 },

  // SS_UNIT
  {
    option_group: "GRADE",
    option_code: "SSG_202",
    label_en: "Stainless Steel 202 (Indoor)",
    swatch_color_hex: "#D1D1D6",
    spec_note: "Indoor stainless grade",
    sort_order: 1,
  },
  {
    option_group: "GRADE",
    option_code: "SSG_304",
    label_en: "Stainless Steel 304 (Food Grade)",
    swatch_color_hex: "#E5E5EA",
    spec_note: "Medical and food-grade stainless",
    badge_text: "Medical / Food Grade",
    sort_order: 2,
  },
  { option_group: "THICKNESS", option_code: "TH_18G", label_en: "18G Top", spec_note: "Standard top thickness", sort_order: 1 },
  { option_group: "THICKNESS", option_code: "TH_16G", label_en: "16G Top (Heavier)", spec_note: "Heavier top thickness", sort_order: 2 },
  { option_group: "SS_FINISH", option_code: "SSF_HAIRLINE", label_en: "Matt Hairline", swatch_color_hex: "#C7CBD1", spec_note: "Easy-clean matt finish", sort_order: 1 },
  { option_group: "SS_FINISH", option_code: "SSF_MIRROR", label_en: "Mirror Buffed", swatch_color_hex: "#E5E7EB", spec_note: "Mirror-buffed finish", sort_order: 2 },

  // QTY_TIER
  { option_group: "QTY_TIER", option_code: "TIER_1_3", label_en: "1-3 Pcs (Retail Price)", spec_note: "Direct factory price with GST invoice", sort_order: 1 },
  { option_group: "QTY_TIER", option_code: "TIER_4_9", label_en: "4-9 Pcs (5% Small Biz Discount)", spec_note: "5% factory rebate applied automatically", sort_order: 2 },
  { option_group: "QTY_TIER", option_code: "TIER_10_PLUS", label_en: "10+ Pcs (12% B2B Factory Wholesale Discount)", spec_note: "12% direct volume bulk pricing", sort_order: 3 },
];

