"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildStoragePath,
  processAdminImage,
  removeStoredImage,
  uploadImageBuffer,
} from "@/lib/admin/images";
import { validateImageSize } from "@/lib/admin/validation";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function numberValue(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(field(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function refreshSets() {
  revalidatePath("/admin/sets");
  revalidatePath("/sets", "layout");
  revalidatePath("/products");
  revalidatePath("/");
}

async function uniqueSetSku(
  db: ReturnType<typeof createServerClient>,
  base: string
): Promise<string> {
  let sku = base;
  let suffix = 2;
  while (true) {
    const { data } = await db
      .from("product_sets")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (!data) return sku;
    sku = `${base}-${suffix++}`;
  }
}

export async function saveSetAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();

  const setId = field(formData, "set_id");
  const name = field(formData, "name").slice(0, 120);
  const rawSku = field(formData, "sku").toUpperCase().replace(/[^A-Z0-9-]/g, "-");
  if (!name || !rawSku) return;

  const payload: Record<string, unknown> = {
    name,
    short_description: field(formData, "short_description").slice(0, 300) || null,
    use_cases: field(formData, "use_cases")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
    sort_order: numberValue(formData, "sort_order", 100),
    is_active: bool(formData, "is_active"),
  };

  const mainFile = formData.get("main_image");
  const hoverFile = formData.get("hover_image");

  async function upload(file: FormDataEntryValue | null, prefix: string) {
    if (!(file instanceof File) || file.size === 0) return null;
    validateImageSize(file.size);
    const processed = await processAdminImage(Buffer.from(await file.arrayBuffer()), true);
    const path = buildStoragePath(rawSku, prefix, "sets");
    return await uploadImageBuffer(db, path, processed.buffer);
  }

  try {
    if (mainFile) payload.main_image_url = await upload(mainFile, "set-main");
    if (hoverFile) payload.hover_image_url = await upload(hoverFile, "set-hover");
  } catch {
    return;
  }

  if (setId) {
    const { data: existing } = await db
      .from("product_sets")
      .select("main_image_url, hover_image_url")
      .eq("id", setId)
      .maybeSingle();

    const { error } = await db.from("product_sets").update(payload).eq("id", setId);
    if (error) return;

    if (payload.main_image_url && existing?.main_image_url) {
      await removeStoredImage(db, existing.main_image_url).catch(() => undefined);
    }
    if (payload.hover_image_url && existing?.hover_image_url) {
      await removeStoredImage(db, existing.hover_image_url).catch(() => undefined);
    }

    await writeAudit(db, session.email, {
      action: "UPDATE",
      target_table: "product_sets",
      target_id: setId,
      summary: `Updated set ${name}.`,
    });

    refreshSets();
    revalidatePath(`/admin/sets/${setId}`);
    return;
  }

  const sku = await uniqueSetSku(db, rawSku);
  const { data, error } = await db
    .from("product_sets")
    .insert({ ...payload, sku })
    .select("id")
    .single();

  if (error || !data) return;

  await writeAudit(db, session.email, {
    action: "CREATE",
    target_table: "product_sets",
    target_id: data.id,
    summary: `Created set ${sku}.`,
  });

  refreshSets();
  redirect(`/admin/sets/${data.id}`);
}

export async function toggleSetAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  const next = field(formData, "next") === "true";
  if (!setId) return;

  const { error } = await db
    .from("product_sets")
    .update({ is_active: next })
    .eq("id", setId);

  if (!error) {
    await writeAudit(db, session.email, {
      action: next ? "ENABLE" : "ARCHIVE",
      target_table: "product_sets",
      target_id: setId,
      summary: `${next ? "Enabled" : "Archived"} set.`,
    });
  }

  refreshSets();
  revalidatePath(`/admin/sets/${setId}`);
}

export async function duplicateSetAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  if (!setId) return;

  const { data: source } = await db
    .from("product_sets")
    .select("*")
    .eq("id", setId)
    .maybeSingle();
  if (!source) return;

  const sku = await uniqueSetSku(db, `${source.sku}-COPY`);
  const { id: _sourceId, created_at: _createdAt, ...sourceFields } = source;
  void _sourceId;
  void _createdAt;

  const { data: copy, error } = await db
    .from("product_sets")
    .insert({
      ...sourceFields,
      sku,
      name: `${source.name} (Copy)`,
      is_active: false,
    })
    .select("id")
    .single();

  if (error || !copy) return;

  const { data: items } = await db
    .from("product_set_items")
    .select("*")
    .eq("set_id", setId);

  if (items && items.length > 0) {
    await db.from("product_set_items").insert(
      items.map((item) => ({
        set_id: copy.id,
        product_id: item.product_id,
        quantity: item.quantity,
        default_selection: item.default_selection,
        allow_customize: item.allow_customize,
        sort_order: item.sort_order,
      }))
    );
  }

  const { data: pricing } = await db
    .from("set_pricing")
    .select("adjustment_type, adjustment_value, note")
    .eq("set_id", setId)
    .maybeSingle();

  if (pricing) {
    await db.from("set_pricing").insert({ ...pricing, set_id: copy.id });
  }

  await writeAudit(db, session.email, {
    action: "DUPLICATE",
    target_table: "product_sets",
    target_id: copy.id,
    summary: `Duplicated set ${source.sku}.`,
  });

  refreshSets();
  redirect(`/admin/sets/${copy.id}`);
}

export async function saveSetItemAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  const itemId = field(formData, "item_id");
  const productId = field(formData, "product_id");
  if (!setId || !productId) return;

  const defaultSelection: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("opt_") || typeof value !== "string" || !value) continue;
    defaultSelection[key.slice(4)] = value;
  }

  const payload = {
    product_id: productId,
    quantity: Math.max(1, Math.min(50, numberValue(formData, "quantity", 1))),
    allow_customize: bool(formData, "allow_customize"),
    default_selection: defaultSelection,
  };

  if (itemId) {
    const { error } = await db
      .from("product_set_items")
      .update(payload)
      .eq("id", itemId);
    if (error) return;

    await writeAudit(db, session.email, {
      action: "UPDATE",
      target_table: "product_set_items",
      target_id: itemId,
      summary: `Updated set item.`,
    });
  } else {
    const { data: last } = await db
      .from("product_set_items")
      .select("sort_order")
      .eq("set_id", setId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await db
      .from("product_set_items")
      .insert({
        ...payload,
        set_id: setId,
        sort_order: Number(last?.sort_order ?? 0) + 10,
      })
      .select("id")
      .single();

    if (error || !data) return;

    await writeAudit(db, session.email, {
      action: "CREATE",
      target_table: "product_set_items",
      target_id: data.id,
      summary: `Added product to set.`,
    });
  }

  refreshSets();
  revalidatePath(`/admin/sets/${setId}`);
}

export async function removeSetItemAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const itemId = field(formData, "item_id");
  const setId = field(formData, "set_id");
  if (!itemId || !setId) return;

  await db.from("product_set_items").delete().eq("id", itemId);

  await writeAudit(db, session.email, {
    action: "DELETE",
    target_table: "product_set_items",
    target_id: itemId,
    summary: "Removed item from set.",
  });

  refreshSets();
  revalidatePath(`/admin/sets/${setId}`);
}

export async function moveSetItemAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  const itemId = field(formData, "item_id");
  const direction = field(formData, "direction");
  if (!setId || !itemId) return;

  const { data } = await db
    .from("product_set_items")
    .select("id, sort_order")
    .eq("set_id", setId)
    .order("sort_order");

  const items = data ?? [];
  const index = items.findIndex((item) => item.id === itemId);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= items.length) return;

  await db
    .from("product_set_items")
    .update({ sort_order: items[swap].sort_order })
    .eq("id", items[index].id);
  await db
    .from("product_set_items")
    .update({ sort_order: items[index].sort_order })
    .eq("id", items[swap].id);

  await writeAudit(db, session.email, {
    action: "UPDATE",
    target_table: "product_set_items",
    target_id: itemId,
    summary: `Reordered set item ${direction}.`,
  });

  revalidatePath(`/admin/sets/${setId}`);
  refreshSets();
}

export async function saveSetPricingAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  if (!setId) return;

  const type = field(formData, "adjustment_type") === "PERCENT" ? "PERCENT" : "AMOUNT";
  const value = numberValue(formData, "adjustment_value", 0);
  const note = field(formData, "note").slice(0, 160) || null;

  await db.from("set_pricing").upsert(
    {
      set_id: setId,
      adjustment_type: type,
      adjustment_value: value,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "set_id" }
  );

  await writeAudit(db, session.email, {
    action: "UPDATE",
    target_table: "set_pricing",
    target_id: setId,
    summary: `Updated private set adjustment.`,
  });

  revalidatePath(`/admin/sets/${setId}`);
  refreshSets();
}

import { calculateSetPrice } from "@/lib/pricing/setPrice";

export interface SetPreviewState {
  ok?: boolean;
  error?: string;
  before?: number;
  after?: number;
}

export async function previewSetPriceAction(
  _state: SetPreviewState,
  formData: FormData
): Promise<SetPreviewState> {
  await requireAdmin();
  const db = createServerClient();
  const setId = field(formData, "set_id");
  if (!setId) return { error: "Save the set first." };

  const { data: set } = await db
    .from("product_sets")
    .select("sku")
    .eq("id", setId)
    .maybeSingle();
  if (!set) return { error: "Set not found." };

  try {
    const result = await calculateSetPrice({ sku: set.sku, quantity: 1 });
    const saved = await db
      .from("set_pricing")
      .select("adjustment_type, adjustment_value")
      .eq("set_id", setId)
      .maybeSingle();

    const enteredType =
      field(formData, "adjustment_type") === "PERCENT" ? "PERCENT" : "AMOUNT";
    const enteredValue = numberValue(formData, "adjustment_value", 0);
    const savedType = saved.data?.adjustment_type ?? "AMOUNT";
    const savedValue = Number(saved.data?.adjustment_value ?? 0);

    let base = result.unit_price;
    if (savedValue !== 0) {
      base =
        savedType === "PERCENT"
          ? base / (1 + savedValue / 100)
          : base - savedValue;
    }

    const adjusted =
      enteredType === "PERCENT"
        ? base * (1 + enteredValue / 100)
        : base + enteredValue;

    const after = Math.max(
      99,
      Math.ceil((adjusted + 1) / 100) * 100 - 1
    );

    return {
      ok: true,
      before: result.unit_price,
      after,
    };
  } catch {
    return { error: "Add priced items before previewing." };
  }
}
