import os
import re

def update_products_page():
    path = 'app/products/page.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    # Update FALLBACK_PRODUCTS categories
    content = content.replace('category: "Cafe & Dining Tables",', 'category: "SS & MS Tables",')
    content = content.replace('category: "Office & Workstation Tables",', 'category: "SS & MS Tables",')

    # Update interface
    old_props = '''interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    use?: string;
    material?: string;
    budget?: string;
    sort?: string;
  }>;
}'''

    new_props = '''interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    use?: string;
    material?: string;
    top?: string;
    budget?: string;
    sort?: string;
  }>;
}'''
    if old_props in content:
        content = content.replace(old_props, new_props)

    old_destruct = 'const { category, use, material, budget, sort = "recommended" } = resolvedParams;'
    new_destruct = 'const { category, use, material, top, budget, sort = "recommended" } = resolvedParams;'
    content = content.replace(old_destruct, new_destruct)

    old_filters = '''  if (material) {
    catalog = catalog.filter((p) => p.material_tags?.includes(material.toUpperCase()));
  }'''

    new_filters = '''  if (material) {
    catalog = catalog.filter((p) => p.material_tags?.includes(material.toUpperCase()));
  }

  if (top) {
    catalog = catalog.filter((p) => {
      const tags = p.material_tags || [];
      const topUpper = top.toUpperCase();
      if (topUpper === "FRAME_ONLY") {
        return tags.includes("FRAME_ONLY") || (!tags.includes("GRANITE") && !tags.includes("WOOD") && !tags.includes("PLYWOOD"));
      }
      if (topUpper === "GRANITE") {
        return tags.includes("GRANITE");
      }
      if (topUpper === "WOOD") {
        return tags.includes("WOOD") || tags.includes("PLYWOOD");
      }
      return true;
    });
  }'''
    if old_filters in content:
        content = content.replace(old_filters, new_filters)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("app/products/page.tsx updated successfully.")

if __name__ == '__main__':
    update_products_page()

def update_product_type_config():
    path = 'lib/productTypeConfig.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    old_table = '''  TABLE: [
    { product_type: "TABLE", option_group: "TOP_TAB", group_title: "Top surface", sort_order: 10, is_required: true, default_code: "WOOD" },'''

    new_table = '''  TABLE: [
    { product_type: "TABLE", option_group: "FRAME_MATERIAL", group_title: "Frame material", sort_order: 5, is_required: true, default_code: "MS" },
    { product_type: "TABLE", option_group: "TOP_TAB", group_title: "Top surface", sort_order: 10, is_required: true, default_code: "WOOD" },'''

    if old_table in content:
        content = content.replace(old_table, new_table)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print("lib/productTypeConfig.ts updated successfully.")

update_product_type_config()

def update_schemas():
    path = 'lib/schemas.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    old_schema = '''export const ConfigPriceInputSchema = z.object({
  sku: z.string().min(1).max(50),
  top_tab: z.enum(["FRAME_ONLY", "WOOD", "STONE", "METAL"]),
  top_material: z.string().nullable().optional(),
  gauge: z.enum(["G18", "G16", "G14", "SS202", "SS304"]),
  frame_color: z.enum(["MATTE_BLACK", "WHITE", "GREY", "RAW", "GOLD"]),
  build_type: z.enum(["WELDED", "KNOCKDOWN"]),
  size: z.enum(["2x2", "3x2", "4x2", "4x2.5", "6x3", "CUSTOM"]),
  addons: z.array(z.enum(["GROMMET", "CPU_HOLDER", "CHAIRS4"])).default([]),
  quantity: z.number().int().min(1).max(500).default(1),
});'''

    new_schema = '''export const ConfigPriceInputSchema = z.object({
  sku: z.string().min(1).max(50),
  frame_material: z.enum(["MS", "SS"]).optional(),
  top_tab: z.enum(["FRAME_ONLY", "WOOD", "STONE", "METAL"]),
  top_material: z.string().nullable().optional(),
  gauge: z.enum(["G18", "G16", "G14", "SS202", "SS304"]),
  frame_color: z.enum(["MATTE_BLACK", "WHITE", "GREY", "RAW", "GOLD", "SS_FINISH", "SS"]),
  build_type: z.enum(["WELDED", "KNOCKDOWN"]),
  size: z.enum(["2x2", "3x2", "4x2", "4x2.5", "6x3", "CUSTOM"]),
  addons: z.array(z.string()).default([]),
  quantity: z.number().int().min(1).max(500).default(1),
});'''

    if old_schema in content:
        content = content.replace(old_schema, new_schema)

    old_chair_frame = 'FRAME_COLOR: z.enum(["MATTE_BLACK", "WHITE", "GREY", "GOLD"]).optional(),'
    new_chair_frame = 'FRAME_COLOR: z.enum(["MATTE_BLACK", "WHITE", "GREY", "GOLD", "SS_FINISH", "SS"]).optional(),'
    if old_chair_frame in content:
        content = content.replace(old_chair_frame, new_chair_frame)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("lib/schemas.ts updated successfully.")

update_schemas()

def update_pricing_core():
    path = 'lib/pricing/pricingCore.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    old_params = '''  ss_weight_factor: number;
  is_ss: boolean;
}):'''
    new_params = '''  ss_weight_factor: number;
  is_ss: boolean;
  powder_coating_cost?: number;
  ss_polishing_cost?: number;
}):'''
    if old_params in content:
        content = content.replace(old_params, new_params)

    old_cost = '''  // Metal weight factor for SS if applicable
  const metalWeightFactor = is_ss ? ss_weight_factor : 1.0;
  const metalCost =
    base_pipe_weight_18g_kg * metalScale * gauge_multiplier * metalWeightFactor * metal_rate_per_kg;'''

    new_cost = '''  // Metal weight factor for SS if applicable
  const metalWeightFactor = is_ss ? ss_weight_factor : 1.0;
  const frameFinishingCost = is_ss
    ? (params.ss_polishing_cost ?? 0)
    : (params.powder_coating_cost ?? 0);
  const metalCost =
    base_pipe_weight_18g_kg * metalScale * gauge_multiplier * metalWeightFactor * metal_rate_per_kg + frameFinishingCost;'''

    if old_cost in content:
        content = content.replace(old_cost, new_cost)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("lib/pricing/pricingCore.ts updated successfully.")

def update_config_price():
    path = 'lib/pricing/configPrice.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n')

    # 1. FALLBACK_RULES IMS-WS-425
    content = content.replace(
        'allowed_top_categories: ["FRAME_ONLY", "WOOD", "METAL"],',
        'allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],'
    )

    # 2. FALLBACK_MATERIAL_RATES
    old_mat_rates = '''  MARBLE_QUARTZ: 320.0,
  SHEET_PERFORATED: 145.0,
  SHEET_MESH: 130.0,
  SHEET_CR_16G: 180.0,
  SHEET_SS304: 380.0,'''
    if old_mat_rates in content:
        content = content.replace(old_mat_rates, '')

    # 3. FALLBACK_GLOBALS
    old_globals = '''  SS_WEIGHT_FACTOR: 1.05,
  PACK2_SAVING: 150.0,
};'''
    new_globals = '''  SS_WEIGHT_FACTOR: 1.05,
  PACK2_SAVING: 150.0,
  POWDER_COATING_COST: 350.0,
  SS_POLISHING_COST: 500.0,
};'''
    if old_globals in content:
        content = content.replace(old_globals, new_globals)

    # 4. ADDON_PRICES
    old_addon = '''const ADDON_PRICES: Record<string, number> = {
  GROMMET: 50,
  CPU_HOLDER: 150,
  CHAIRS4: 600,
};'''
    new_addon = 'const ADDON_PRICES: Record<string, number> = {};'
    if old_addon in content:
        content = content.replace(old_addon, new_addon)

    # 5. FALLBACK_OPTION_PRICING: remove WHITE, GOLD
    content = content.replace('  WHITE: { flat: 0 },\n', '')
    content = content.replace('  GOLD: { flat: 150 },\n', '')

    # 6. isSS & metalCode in calculateConfigPrice
    old_metal_calc = '''  const isSS = input.gauge === "SS202" || input.gauge === "SS304";
  const metalCode = input.gauge === "SS304" ? "SS_304" : input.gauge === "SS202" ? "SS_202" : "MS_CR";
  const metalRate = FALLBACK_MATERIAL_RATES[metalCode] || 78.5;'''

    new_metal_calc = '''  const isSS =
    (input as any).frame_material === "SS" ||
    input.gauge === "SS202" ||
    input.gauge === "SS304";
  const metalCode =
    input.gauge === "SS304"
      ? "SS_304"
      : input.gauge === "SS202" || (input as any).frame_material === "SS"
      ? "SS_202"
      : "MS_CR";
  const metalRate = FALLBACK_MATERIAL_RATES[metalCode] || (isSS ? 185.0 : 78.5);'''

    if old_metal_calc in content:
        content = content.replace(old_metal_calc, new_metal_calc)

    # 7. Remove sheet/quartz top matching
    old_quartz_sheet = '''      else if (input.top_material.startsWith("QUARTZ_")) targetMatCode = "MARBLE_QUARTZ";
      else if (input.top_material === "SHEET_PERFORATED_OPT") targetMatCode = "SHEET_PERFORATED";
      else if (input.top_material === "SHEET_MESH_OPT") targetMatCode = "SHEET_MESH";
      else if (input.top_material === "SHEET_CR_16G_OPT") targetMatCode = "SHEET_CR_16G";
      else if (input.top_material === "SHEET_SS304_OPT") targetMatCode = "SHEET_SS304";'''
    if old_quartz_sheet in content:
        content = content.replace(old_quartz_sheet, '')

    # 8. Pass powder_coating_cost & ss_polishing_cost
    old_raw_call = '''    ss_weight_factor: globals.SS_WEIGHT_FACTOR,
    is_ss: isSS,
  });'''
    new_raw_call = '''    ss_weight_factor: globals.SS_WEIGHT_FACTOR,
    is_ss: isSS,
    powder_coating_cost: globals.POWDER_COATING_COST ?? 350.0,
    ss_polishing_cost: globals.SS_POLISHING_COST ?? 500.0,
  });'''
    if old_raw_call in content:
        content = content.replace(old_raw_call, new_raw_call)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("lib/pricing/configPrice.ts updated successfully.")

update_pricing_core()
update_config_price()

def update_admin_product_form():
    form_path = 'app/admin/(dashboard)/products/[id]/ProductForm.tsx'
    with open(form_path, 'r', encoding='utf-8') as f:
        form_content = f.read().replace('\r\n', '\n')

    # Remove metal rate from type
    form_content = form_content.replace(
        'rates?: { ms: number; wood: number; stone: number; metal: number };',
        'rates?: { ms: number; wood: number; stone: number };'
    )
    form_content = form_content.replace(
        'materialRates?: { ms: number; wood: number; stone: number; metal: number };',
        'materialRates?: { ms: number; wood: number; stone: number };'
    )
    form_content = form_content.replace(
        'const priceRates = rates ?? { ms: 0, wood: 0, stone: 0, metal: 0 };',
        'const priceRates = rates ?? { ms: 0, wood: 0, stone: 0 };'
    )

    # Costing preview topRate calculation
    old_calc = ''': key === "STONE"
        ? priceRates.stone
        : key === "METAL"
        ? priceRates.metal
        : 0;'''
    new_calc = ''': key === "STONE"
        ? priceRates.stone
        : 0;'''
    if old_calc in form_content:
        form_content = form_content.replace(old_calc, new_calc)

    # Row label
    old_row_label = ''': row.key === "STONE"
                ? "With stone/granite top"
                : "With metal top"}'''
    new_row_label = ''': "With stone/granite top"}'''
    if old_row_label in form_content:
        form_content = form_content.replace(old_row_label, new_row_label)

    # Metal top image card
    old_metal_image = '''          {topCategories.includes("METAL") && (
            <ImageDropField
              name="top_metal_image"
              removeName="remove_top_metal_image"
              label="Metal top image"
              helper="Shown when the customer picks Metal Top."
              currentUrl={product?.top_category_images?.METAL ?? null}
            />
          )}'''
    if old_metal_image in form_content:
        form_content = form_content.replace(old_metal_image, '')

    with open(form_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(form_content)
    print("ProductForm.tsx updated successfully.")

    page_path = 'app/admin/(dashboard)/products/[id]/page.tsx'
    with open(page_path, 'r', encoding='utf-8') as f:
        page_content = f.read().replace('\r\n', '\n')

    # Remove metal from formMaterialRates
    page_content = page_content.replace('    metal: rateMap.get("SHEET_CR_16G") ?? 0,\n', '')

    # Ensure FRAME_MATERIAL in allOptions and availabilityGroups
    old_all_options = '''  const allOptions: AdminOption[] = (optionResult.data ?? []).map((option) => ({'''
    new_all_options = '''  const dbOptions: AdminOption[] = (optionResult.data ?? []).map((option) => ({'''

    if old_all_options in page_content:
        page_content = page_content.replace(old_all_options, new_all_options)
        # inject fallback frame material options if missing
        insert_code = '''  const allOptions: AdminOption[] = [...dbOptions];
  if (!allOptions.some((o) => o.option_group === "FRAME_MATERIAL")) {
    allOptions.unshift(
      {
        option_group: "FRAME_MATERIAL",
        option_code: "MS",
        parent_code: null,
        label_en: "Mild Steel (Powder Coated)",
        swatch_texture_img: null,
      },
      {
        option_group: "FRAME_MATERIAL",
        option_code: "SS",
        parent_code: null,
        label_en: "Stainless Steel (SS 202 / 304)",
        swatch_texture_img: null,
      }
    );
  }
'''
        page_content = page_content.replace(
            '  }));\n\n  const materialOptions:',
            '  }));\n' + insert_code + '\n  const materialOptions:'
        )

    # In availabilityGroups:
    old_avail = '''    availabilityGroups = (typeGroupResult.data ?? [])
      .filter((group) => group.is_active !== false)
      .map((group) => ({
        option_group: group.option_group,
        group_title: group.group_title,
      }));'''

    new_avail = '''    availabilityGroups = (typeGroupResult.data ?? [])
      .filter((group) => group.is_active !== false)
      .map((group) => ({
        option_group: group.option_group,
        group_title: group.group_title,
      }));

    if (product.product_type === "TABLE" && !availabilityGroups.some((g) => g.option_group === "FRAME_MATERIAL")) {
      availabilityGroups.unshift({
        option_group: "FRAME_MATERIAL",
        group_title: "Frame material",
      });
    }'''
    if old_avail in page_content:
        page_content = page_content.replace(old_avail, new_avail)

    with open(page_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(page_content)
    print("app/admin/(dashboard)/products/[id]/page.tsx updated successfully.")

update_admin_product_form()
