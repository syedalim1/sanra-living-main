"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import { buildStoragePath, uploadImageFile } from "@/lib/admin/images";
import { validateImageSize } from "@/lib/admin/validation";
import { PRODUCT_TYPES, type ProductType } from "@/lib/productTypeConfig";
import { FALLBACK_OPTIONS } from "@/lib/configuratorOptions";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";

const DISPLAY_STYLES = ["SWATCH", "CARD", "PILL", "CHECKBOX"] as const;
const APPLIES_TO = ["FLAT", "METAL_WEIGHT", "TOP_AREA", "PER_UNIT"] as const;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function numberOrNull(formData: FormData, key: string): number | null {
  const raw = field(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function codeFrom(value: string, fallback: string): string {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return code || fallback;
}

function isProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as string[]).includes(value);
}

type GroupProductType = ProductType | "CHAIR_TABLE_SET";

function isGroupProductType(value: string): value is GroupProductType {
  return isProductType(value) || value === "CHAIR_TABLE_SET";
}

function isDisplayStyle(value: string): value is (typeof DISPLAY_STYLES)[number] {
  return (DISPLAY_STYLES as readonly string[]).includes(value);
}

function isAppliesTo(value: string): value is (typeof APPLIES_TO)[number] {
  return (APPLIES_TO as readonly string[]).includes(value);
}

async function uniqueGroupCode(
  db: ReturnType<typeof createServerClient>,
  productType: string,
  base: string
): Promise<string> {
  let code = base;
  let suffix = 2;
  while (true) {
    const { data } = await db
      .from("product_type_option_groups")
      .select("option_group")
      .eq("product_type", productType)
      .eq("option_group", code)
      .maybeSingle();
    if (!data) return code;
    code = `${base}_${suffix++}`.slice(0, 40);
  }
}

async function uniqueOptionCode(
  db: ReturnType<typeof createServerClient>,
  base: string
): Promise<string> {
  let code = base;
  let suffix = 2;
  while (true) {
    const { data } = await db
      .from("configurator_options")
      .select("option_code")
      .eq("option_code", code)
      .maybeSingle();
    if (!data) return code;
    code = `${base}_${suffix++}`.slice(0, 40);
  }
}

function refreshOptions() {
  revalidatePath("/admin/options");
  revalidatePath("/products");
}

export async function saveGroupAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();

  const productType = field(formData, "product_type");
  if (!isGroupProductType(productType)) return;

  const title = field(formData, "group_title").slice(0, 80);
  if (!title) return;

  const displayStyle = isDisplayStyle(field(formData, "display_style"))
    ? field(formData, "display_style")
    : "SWATCH";
  const original = field(formData, "original_group");
  const payload = {
    group_title: title,
    display_style: displayStyle,
    is_required: bool(formData, "is_required"),
    allow_multiple: bool(formData, "allow_multiple"),
    is_active: bool(formData, "is_active"),
  };

  if (original) {
    const { error } = await db
      .from("product_type_option_groups")
      .update(payload)
      .eq("product_type", productType)
      .eq("option_group", original);

    if (!error) {
      await writeAudit(db, session.email, {
        action: "UPDATE",
        target_table: "product_type_option_groups",
        target_id: `${productType}:${original}`,
        summary: `Updated option group ${title}.`,
      });
    }
  } else {
    const code = await uniqueGroupCode(
      db,
      productType,
      codeFrom(title, "GROUP")
    );
    const { data: last } = await db
      .from("product_type_option_groups")
      .select("sort_order")
      .eq("product_type", productType)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await db.from("product_type_option_groups").insert({
      product_type: productType,
      option_group: code,
      sort_order: Number(last?.sort_order ?? 0) + 10,
      default_code: null,
      ...payload,
    });

    if (!error) {
      await writeAudit(db, session.email, {
        action: "CREATE",
        target_table: "product_type_option_groups",
        target_id: `${productType}:${code}`,
        summary: `Created option group ${title}.`,
      });
    }
  }

  refreshOptions();
}

export async function toggleGroupAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const productType = field(formData, "product_type");
  const group = field(formData, "option_group");
  const next = field(formData, "next") === "true";
  if (!isGroupProductType(productType) || !group) return;

  const { error } = await db
    .from("product_type_option_groups")
    .update({ is_active: next })
    .eq("product_type", productType)
    .eq("option_group", group);

  if (!error) {
    await writeAudit(db, session.email, {
      action: next ? "ENABLE" : "DISABLE",
      target_table: "product_type_option_groups",
      target_id: `${productType}:${group}`,
      summary: `${next ? "Enabled" : "Disabled"} option group.`,
    });
  }

  refreshOptions();
}

export async function moveGroupAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const productType = field(formData, "product_type");
  const group = field(formData, "option_group");
  const direction = field(formData, "direction");
  if (!isGroupProductType(productType) || !group) return;

  const { data } = await db
    .from("product_type_option_groups")
    .select("option_group, sort_order")
    .eq("product_type", productType)
    .order("sort_order");

  const groups = data ?? [];
  const index = groups.findIndex((row) => row.option_group === group);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= groups.length) return;

  const current = groups[index];
  const other = groups[swapIndex];

  await db
    .from("product_type_option_groups")
    .update({ sort_order: Number(other.sort_order) })
    .eq("product_type", productType)
    .eq("option_group", current.option_group);

  await db
    .from("product_type_option_groups")
    .update({ sort_order: Number(current.sort_order) })
    .eq("product_type", productType)
    .eq("option_group", other.option_group);

  await writeAudit(db, session.email, {
    action: "UPDATE",
    target_table: "product_type_option_groups",
    target_id: `${productType}:${group}`,
    summary: `Reordered option group ${direction}.`,
  });

  refreshOptions();
}

export async function saveOptionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();

  const group = field(formData, "option_group");
  const label = field(formData, "label_en").slice(0, 140);
  if (!group || !label) return;

  const original = field(formData, "original_code");
  const active = bool(formData, "is_active");
  const badge = field(formData, "badge_text").slice(0, 40);
  const note = field(formData, "spec_note").slice(0, 160);
  const warranty = field(formData, "warranty_text").slice(0, 160);
  const color = field(formData, "swatch_color_hex").slice(0, 20);
  const loadKg = numberOrNull(formData, "load_kg");

  let optionCode = original;
  if (!optionCode) {
    optionCode = await uniqueOptionCode(db, codeFrom(label, "OPTION"));
  }

  let swatchUrl: string | null | undefined = undefined;
  const file = formData.get("swatch_file");
  if (file instanceof File && file.size > 0) {
    try {
      validateImageSize(file.size);
      swatchUrl = await uploadImageFile(db, buildStoragePath(optionCode, "swatch", group), file);
    } catch {
      return;
    }
  } else if (bool(formData, "remove_swatch")) {
    swatchUrl = null;
  }

  const payload: Record<string, unknown> = {
    option_group: group,
    label_en: label,
    swatch_color_hex: color || null,
    spec_note: note || null,
    badge_text: badge || null,
    load_kg: loadKg,
    warranty_text: warranty || null,
    is_active: active,
  };
  if (swatchUrl !== undefined) payload.swatch_texture_img = swatchUrl;

  if (original) {
    const { error } = await db
      .from("configurator_options")
      .update(payload)
      .eq("option_code", original);
    if (error) return;
  } else {
    const { data: last } = await db
      .from("configurator_options")
      .select("sort_order")
      .eq("option_group", group)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await db.from("configurator_options").insert({
      ...payload,
      option_code: optionCode,
      parent_code: null,
      sort_order: Number(last?.sort_order ?? 0) + 10,
    });
    if (error) return;
  }

  const appliesToRaw = field(formData, "applies_to");
  const appliesTo = isAppliesTo(appliesToRaw) ? appliesToRaw : "FLAT";
  const value = numberOrNull(formData, "price_value") ?? 0;
  const materialCode = field(formData, "material_code") || null;

  const pricing = {
    material_code: materialCode,
    applies_to: appliesTo,
    metal_cost_multiplier: appliesTo === "METAL_WEIGHT" ? value : 1,
    flat_addon: appliesTo === "FLAT" || appliesTo === "PER_UNIT" ? value : 0,
    per_sqft_addon: appliesTo === "TOP_AREA" ? value : 0,
  };

  await db.from("option_pricing").upsert(
    { option_code: optionCode, ...pricing },
    { onConflict: "option_code" }
  );

  await writeAudit(db, session.email, {
    action: original ? "UPDATE" : "CREATE",
    target_table: "configurator_options",
    target_id: optionCode,
    summary: `${original ? "Updated" : "Created"} option ${label} in ${group}.`,
  });

  refreshOptions();
}

export async function toggleOptionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const code = field(formData, "option_code");
  const next = field(formData, "next") === "true";
  if (!code) return;

  const { error } = await db
    .from("configurator_options")
    .update({ is_active: next })
    .eq("option_code", code);

  if (!error) {
    await writeAudit(db, session.email, {
      action: next ? "ENABLE" : "DISABLE",
      target_table: "configurator_options",
      target_id: code,
      summary: `${next ? "Enabled" : "Disabled"} option ${code}.`,
    });
  }

  refreshOptions();
}

const OPTION_COLUMNS =
  "option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, swatch_texture_img, spec_note, badge_text, load_kg, warranty_text, is_active, sort_order";

export async function duplicateOptionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const code = field(formData, "option_code");
  if (!code) return;

  const [{ data: option, error }, { data: pricing }] = await Promise.all([
    db.from("configurator_options").select(OPTION_COLUMNS).eq("option_code", code).maybeSingle(),
    db.from("option_pricing").select("*").eq("option_code", code).maybeSingle(),
  ]);

  if (error || !option) return;

  const newCode = await uniqueOptionCode(db, `${code}_COPY`);
  const { error: insertError } = await db.from("configurator_options").insert({
    ...option,
    option_code: newCode,
    label_en: `${option.label_en} (Copy)`,
    is_active: false,
  });

  if (insertError) return;

  if (pricing) {
    await db.from("option_pricing").upsert(
      {
        option_code: newCode,
        material_code: pricing.material_code,
        metal_cost_multiplier: pricing.metal_cost_multiplier,
        flat_addon: pricing.flat_addon,
        per_sqft_addon: pricing.per_sqft_addon,
        applies_to: pricing.applies_to ?? "FLAT",
      },
      { onConflict: "option_code" }
    );
  }

  await writeAudit(db, session.email, {
    action: "DUPLICATE",
    target_table: "configurator_options",
    target_id: newCode,
    summary: `Duplicated option ${code} as ${newCode}.`,
  });

  refreshOptions();
}

export async function duplicateGroupAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const productType = field(formData, "product_type");
  const group = field(formData, "option_group");
  if (!isGroupProductType(productType) || !group) return;

  const { data: source } = await db
    .from("product_type_option_groups")
    .select("*")
    .eq("product_type", productType)
    .eq("option_group", group)
    .maybeSingle();

  if (!source) return;

  const newGroup = await uniqueGroupCode(db, productType, `${group}_COPY`);
  const { data: last } = await db
    .from("product_type_option_groups")
    .select("sort_order")
    .eq("product_type", productType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("product_type_option_groups").insert({
    product_type: productType,
    option_group: newGroup,
    group_title: `${source.group_title} (Copy)`,
    sort_order: Number(last?.sort_order ?? 0) + 10,
    is_required: source.is_required,
    default_code: null,
    display_style: source.display_style ?? "SWATCH",
    allow_multiple: source.allow_multiple ?? false,
    is_active: false,
  });

  if (error) return;

  const { data: options } = await db
    .from("configurator_options")
    .select(OPTION_COLUMNS)
    .eq("option_group", group);

  for (const option of options ?? []) {
    const newCode = await uniqueOptionCode(db, `${option.option_code}_COPY`);
    const { error: optionError } = await db.from("configurator_options").insert({
      ...option,
      option_group: newGroup,
      option_code: newCode,
      is_active: false,
    });

    if (optionError) continue;

    const { data: pricing } = await db
      .from("option_pricing")
      .select("*")
      .eq("option_code", option.option_code)
      .maybeSingle();

    if (pricing) {
      await db.from("option_pricing").upsert(
        {
          option_code: newCode,
          material_code: pricing.material_code,
          metal_cost_multiplier: pricing.metal_cost_multiplier,
          flat_addon: pricing.flat_addon,
          per_sqft_addon: pricing.per_sqft_addon,
          applies_to: pricing.applies_to ?? "FLAT",
        },
        { onConflict: "option_code" }
      );
    }
  }

  await writeAudit(db, session.email, {
    action: "DUPLICATE",
    target_table: "product_type_option_groups",
    target_id: `${productType}:${newGroup}`,
    summary: `Duplicated group ${group} as ${newGroup}.`,
  });

  refreshOptions();
}

export async function saveAvailabilityAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const productId = field(formData, "product_id");
  const productType = field(formData, "product_type");
  if (!productId || !isProductType(productType)) return;

  const enabledCodes = new Set(
    formData
      .getAll("option")
      .filter((value): value is string => typeof value === "string")
  );

  const { data: groups } = await db
    .from("product_type_option_groups")
    .select("option_group, is_required, default_code, is_active")
    .eq("product_type", productType);

  // Only active groups are rendered in the admin form. Saving availability for
  // an inactive group used to mark every option in it as disabled without the
  // admin ever seeing those checkboxes.
  const activeGroups = (groups ?? []).filter((group) => group.is_active !== false);
  const groupCodes = activeGroups.map((group) => group.option_group);

  if (groupCodes.length === 0) return;

  const { data: options } = await db
    .from("configurator_options")
    .select("option_code, option_group, parent_code")
    .in("option_group", groupCodes)
    .eq("is_active", true);

  type ManagedOption = {
    option_code: string;
    option_group: string;
    parent_code: string | null;
  };

  const managed = new Map<string, ManagedOption>();
  const addOption = (option: ManagedOption) => {
    if (option.option_code === "FRAME_ONLY" || option.option_code.startsWith("SHEET_")) {
      return;
    }
    managed.set(option.option_code, option);
  };

  // Match the option list rendered on the product edit page: built-in
  // catalogue plus DB options. Availability rows are keyed by option_code.
  for (const option of FALLBACK_OPTIONS) {
    if (groupCodes.includes(option.option_group)) {
      addOption({
        option_code: option.option_code,
        option_group: option.option_group,
        parent_code: option.parent_code ?? null,
      });
    }
  }
  for (const option of options ?? []) {
    addOption({
      option_code: option.option_code,
      option_group: option.option_group,
      parent_code: option.parent_code ?? null,
    });
  }

  const enabled = new Set([...enabledCodes].filter((code) => managed.has(code)));

  // A required group must keep at least one option so the public configurator
  // can still produce a valid configuration and price.
  const ensureGroupHasEnabled = (optionGroup: string, defaultCode: string | null) => {
    const groupOptions = [...managed.values()].filter(
      (option) => option.option_group === optionGroup
    );
    if (groupOptions.length === 0) return;
    if (groupOptions.some((option) => enabled.has(option.option_code))) return;

    const fallback =
      groupOptions.find((option) => option.option_code === defaultCode) ??
      groupOptions[0];
    enabled.add(fallback.option_code);
  };

  for (const group of activeGroups) {
    if (group.is_required) {
      ensureGroupHasEnabled(group.option_group, group.default_code ?? null);
    }
  }

  // An enabled top family must have at least one enabled top material.
  const enabledTopTabs = [...managed.values()]
    .filter(
      (option) => option.option_group === "TOP_TAB" && enabled.has(option.option_code)
    )
    .map((option) => option.option_code);

  if (enabledTopTabs.length > 0) {
    const topMaterials = [...managed.values()].filter(
      (option) =>
        option.option_group === "TOP_MATERIAL" &&
        option.parent_code !== null &&
        enabledTopTabs.includes(option.parent_code)
    );

    for (const tab of enabledTopTabs) {
      const tabMaterials = topMaterials.filter((option) => option.parent_code === tab);
      if (
        tabMaterials.length > 0 &&
        !tabMaterials.some((option) => enabled.has(option.option_code))
      ) {
        enabled.add(tabMaterials[0].option_code);
      }
    }
  }

  const managedOptions = [...managed.values()];

  await db.from("product_option_availability").delete().eq("product_id", productId);

  if (managedOptions.length > 0) {
    await db.from("product_option_availability").insert(
      managedOptions.map((option) => ({
        product_id: productId,
        option_code: option.option_code,
        is_enabled: enabled.has(option.option_code),
      }))
    );
  }

  await writeAudit(db, session.email, {
    action: "UPDATE",
    target_table: "product_option_availability",
    target_id: productId,
    summary: `Saved product option availability (${enabled.size} enabled).`,
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
  revalidatePath(`/admin/options`);
}

const PreviewSchema = z.object({
  productId: z.string().uuid(),
  optionCode: z.string().min(1).max(60),
});

export interface OptionPreviewState {
  ok?: boolean;
  error?: string;
  baseline?: number;
  updated?: number;
  delta?: number;
}

export async function previewOptionPriceAction(
  _state: OptionPreviewState,
  formData: FormData
): Promise<OptionPreviewState> {
  await requireAdmin();
  const db = createServerClient();
  const parsed = PreviewSchema.safeParse({
    productId: field(formData, "product_id"),
    optionCode: field(formData, "option_code"),
  });

  if (!parsed.success) return { error: "Choose a product first." };

  const { data: product } = await db
    .from("products")
    .select("sku, product_type")
    .eq("id", parsed.data.productId)
    .maybeSingle();

  if (!product) return { error: "Product not found." };
  if (product.product_type === "TABLE") {
    return {
      error:
        "Preview is available for Chair, Stand, Rack and SS Unit products. Table keeps its legacy fixed configurator.",
    };
  }

  const { data: groups } = await db
    .from("product_type_option_groups")
    .select("option_group, default_code, sort_order, is_active")
    .eq("product_type", product.product_type)
    .order("sort_order");

  const { data: options } = await db
    .from("configurator_options")
    .select("option_group, option_code, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order");

  if (!groups || !options) return { error: "Unable to load options." };

  const selections: Record<string, string> = {};

  for (const group of groups) {
    if (group.is_active === false) continue;
    const groupOptions = options.filter(
      (option) => option.option_group === group.option_group
    );
    if (groupOptions.length === 0) continue;
    selections[group.option_group] =
      groupOptions.find((option) => option.option_code === group.default_code)
        ?.option_code ?? groupOptions[0].option_code;
  }

  const target = options.find((option) => option.option_code === parsed.data.optionCode);
  if (!target) return { error: "Option not found." };
  selections[target.option_group] = target.option_code;

  const baselineSelections = { ...selections };
  const source = options.find((option) => option.option_code === target.option_code);
  if (!source) return { error: "Option not found." };

  const beforeGroupOptions = options.filter(
    (option) => option.option_group === target.option_group
  );
  const groupDefault = groups.find(
    (group) => group.option_group === target.option_group
  );
  const previousCode =
    beforeGroupOptions.find((option) => option.option_code === groupDefault?.default_code)
      ?.option_code ?? beforeGroupOptions[0]?.option_code;

  if (previousCode) {
    baselineSelections[target.option_group] = previousCode;
  } else {
    delete baselineSelections[target.option_group];
  }

  const envelopeBase = {
    sku: product.sku,
    quantity: 1,
    selections: baselineSelections,
  };
  const envelopeUpdated = {
    sku: product.sku,
    quantity: 1,
    selections,
  };

  try {
    const [before, after] = await Promise.all([
      calculateConfigPrice(envelopeBase),
      calculateConfigPrice(envelopeUpdated),
    ]);

    const baseline = Number(before.unit_price ?? before.total_price ?? 0);
    const updated = Number(after.unit_price ?? after.total_price ?? 0);

    return {
      ok: true,
      baseline,
      updated,
      delta: updated - baseline,
    };
  } catch {
    return { error: "Unable to preview this option. Check required selections." };
  }
}
