"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import { productPath } from "@/lib/site";
import {
  ProductFormSchema,
  VariantFormSchema,
  formString,
  formStringArray,
  parseBoolean,
  parseNumber,
  validateImageSize,
} from "@/lib/admin/validation";

import {
  buildStoragePath,
  isManagedImage,
  processAdminImage,
  removeStoredImage,
  uploadImageBuffer,
} from "@/lib/admin/images";
import type { AdminActionResult } from "@/lib/admin/product-types";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";
const UUID = z.string().uuid();

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

function revalidateCatalog(sku?: string): void {
  revalidateTag("sanra-from-prices", { expire: 0 });
  revalidatePath("/products");
  revalidatePath("/products/[sku]", "page");
  revalidatePath("/admin/products");
  revalidatePath("/admin/audit");
  if (sku) {
    revalidatePath(productPath(sku));
  }
}

function getFormFile(formData: FormData, key: string): File | null {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 ? file : null;
}

function getUploadFile(formData: FormData): File | null {
  return getFormFile(formData, "file");
}

async function storeProductImage(
  db: SupabaseClient,
  sku: string,
  kind: string,
  file: File
): Promise<string> {
  validateImageSize(file.size);
  const processed = await processAdminImage(Buffer.from(await file.arrayBuffer()), true);
  const path = buildStoragePath(sku, kind);
  return await uploadImageBuffer(db, path, processed.buffer);
}

async function discardUploads(
  db: SupabaseClient,
  urls: Array<string | null>
): Promise<void> {
  await Promise.all(urls.map((url) => removeStoredImage(db, url).catch(() => undefined)));
}

async function isImageReferencedByVariant(
  db: SupabaseClient,
  productId: string,
  url: string | null | undefined
): Promise<boolean> {
  if (!url) return false;
  const { data } = await db
    .from("product_visual_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("preview_image_url", url)
    .limit(1);

  return Boolean(data && data.length > 0);
}

export async function saveProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  let redirectTo: string | null = null;

  try {
    const rawId = formString(formData.get("id"));
    const productId = rawId || null;

    if (productId && !UUID.safeParse(productId).success) {
      return { ok: false, error: "Invalid product id." };
    }

    const productType = formString(formData.get("product_type"));

    const parsed = ProductFormSchema.safeParse({
      sku: formString(formData.get("sku")),
      name: formString(formData.get("name")),
      category: formString(formData.get("category")),
      product_type: productType,
      base_length_ft: parseNumber(formData.get("base_length_ft")),
      base_width_ft: parseNumber(formData.get("base_width_ft")),
      base_height_ft: parseNumber(formData.get("base_height_ft"), 2.5),
      pipe_spec: formString(formData.get("pipe_spec")),
      use_cases: formStringArray(formData, "use_cases"),
      material_tags: formStringArray(formData, "material_tags"),
      sort_order: Math.trunc(parseNumber(formData.get("sort_order"), 100)),
      warranty_text: formString(formData.get("warranty_text")),
      is_active: parseBoolean(formData.get("is_active")),
      is_knockdown_available: parseBoolean(formData.get("is_knockdown_available")),
      allowed_top_categories: formStringArray(formData, "allowed_top_categories"),
      costing: {
        base_pipe_weight_18g_kg: parseNumber(formData.get("base_pipe_weight_18g_kg")),
        top_area_sqft: parseNumber(formData.get("top_area_sqft")),
        consumables_cost: parseNumber(formData.get("consumables_cost")),
        labor_cost: parseNumber(formData.get("labor_cost")),
        overhead_pct: parseNumber(formData.get("overhead_pct")),
        retail_margin_pct: parseNumber(formData.get("retail_margin_pct")),
        b2b_margin_pct: parseNumber(formData.get("b2b_margin_pct")),
        finishing_cost: parseNumber(formData.get("finishing_cost"), 0),
        b2b_moq: Math.max(1, Math.trunc(parseNumber(formData.get("b2b_moq"), 1))),
      },
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the product fields.",
      };
    }

    const values = parsed.data;
    const skuCheck = await db
      .from("products")
      .select("id")
      .eq("sku", values.sku)
      .maybeSingle();

    if (skuCheck.error) {
      return { ok: false, error: "Unable to validate the SKU." };
    }

    if (skuCheck.data && skuCheck.data.id !== productId) {
      return { ok: false, error: "That SKU already exists." };
    }

    const mainFile = getFormFile(formData, "main_image");
    const hoverFile = getFormFile(formData, "hover_image");
    const removeMainImage = parseBoolean(formData.get("remove_main_image"));
    const removeHoverImage = parseBoolean(formData.get("remove_hover_image"));

    let uploadedMainUrl: string | null = null;
    let uploadedHoverUrl: string | null = null;
    const uploadedTopImages: Record<string, string> = {};
    const uploadedGallery: string[] = [];

    const topImageFields = [
      { field: "top_wood_image", key: "WOOD", prefix: "top-wood" },
      { field: "top_stone_image", key: "STONE", prefix: "top-stone" },
      { field: "top_frame_image", key: "FRAME_ONLY", prefix: "top-frame" },
      { field: "top_metal_image", key: "METAL", prefix: "top-metal" },
    ];

    try {
      if (mainFile) {
        uploadedMainUrl = await storeProductImage(db, values.sku, "main", mainFile);
      }
      if (hoverFile) {
        uploadedHoverUrl = await storeProductImage(db, values.sku, "hover", hoverFile);
      }

      for (const entry of topImageFields) {
        const file = getFormFile(formData, entry.field);
        if (file) {
          uploadedTopImages[entry.key] = await storeProductImage(
            db,
            values.sku,
            entry.prefix,
            file
          );
        }
      }

      for (let index = 1; index <= 4; index += 1) {
        const file = getFormFile(formData, `gallery_image_${index}`);
        if (file) {
          uploadedGallery.push(
            await storeProductImage(db, values.sku, `gallery-${index}`, file)
          );
        }
      }
    } catch (error) {
      await discardUploads(db, [
        uploadedMainUrl,
        uploadedHoverUrl,
        ...Object.values(uploadedTopImages),
        ...uploadedGallery,
      ]);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Image upload failed.",
      };
    }

    const comboConfig =
      productType === "CHAIR_TABLE_SET" || productType === "BENCH_DESK"
        ? {
            set_configuration: formString(formData.get("set_configuration")),
            seating_type: formString(formData.get("seating_type")),
            chair_quantity: Math.max(0, Math.trunc(parseNumber(formData.get("chair_quantity"), 0))),
            single_chair_cost: parseNumber(formData.get("single_chair_cost"), 0),
            chair_metal_weight_kg: parseNumber(formData.get("chair_metal_weight_kg"), 0),
            combo_discount_pct: parseNumber(formData.get("combo_discount_pct"), 0),
          }
        : {};

    const productRow = {
      sku: values.sku,
      name: values.name,
      category: values.category,
      product_type: values.product_type,
      base_length_ft: values.base_length_ft,
      base_width_ft: values.base_width_ft,
      base_height_ft: values.base_height_ft,
      pipe_spec: values.pipe_spec || null,
      combo_config: comboConfig,
      allowed_top_categories: values.allowed_top_categories,
      is_knockdown_available: values.is_knockdown_available,
      warranty_text: values.warranty_text,
      is_active: values.is_active,
      use_cases: values.use_cases,
      material_tags: values.material_tags,
      sort_order: values.sort_order,
    };

    let savedProductId: string;

    if (productId) {
      const existing = await db
        .from("products")
        .select(
          "id, sku, main_image_url, hover_blueprint_img, top_category_images, gallery_images"
        )
        .eq("id", productId)
        .maybeSingle();

      if (existing.error || !existing.data) {
        await discardUploads(db, [
          uploadedMainUrl,
          uploadedHoverUrl,
          ...Object.values(uploadedTopImages),
          ...uploadedGallery,
        ]);
        return { ok: false, error: "Product not found." };
      }

      const productUpdate: Record<string, unknown> = { ...productRow };

      if (uploadedMainUrl) {
        productUpdate.main_image_url = uploadedMainUrl;
      } else if (removeMainImage) {
        productUpdate.main_image_url = PRODUCT_PLACEHOLDER;
      }

      if (uploadedHoverUrl) {
        productUpdate.hover_blueprint_img = uploadedHoverUrl;
      } else if (removeHoverImage) {
        productUpdate.hover_blueprint_img = null;
      }

      if (Object.keys(uploadedTopImages).length > 0) {
        productUpdate.top_category_images = {
          ...((existing.data.top_category_images ?? {}) as Record<string, string>),
          ...uploadedTopImages,
        };
      }

      if (uploadedGallery.length > 0) {
        const existingGallery = Array.isArray(existing.data.gallery_images)
          ? (existing.data.gallery_images as string[])
          : [];
        productUpdate.gallery_images = [...existingGallery, ...uploadedGallery].slice(-8);
      }

      const { error } = await db.from("products").update(productUpdate).eq("id", productId);
      if (error) {
        await discardUploads(db, [
          uploadedMainUrl,
          uploadedHoverUrl,
          ...Object.values(uploadedTopImages),
          ...uploadedGallery,
        ]);
        return {
          ok: false,
          error: isUniqueViolation(error) ? "That SKU already exists." : "Unable to save product.",
        };
      }

      const nextMain = uploadedMainUrl ?? (removeMainImage ? PRODUCT_PLACEHOLDER : existing.data.main_image_url);
      const nextHover = uploadedHoverUrl ?? (removeHoverImage ? null : existing.data.hover_blueprint_img);

      if (nextMain !== existing.data.main_image_url) {
        if (!(await isImageReferencedByVariant(db, productId, existing.data.main_image_url))) {
          await removeStoredImage(db, existing.data.main_image_url).catch(() => undefined);
        }
      }

      if (nextHover !== existing.data.hover_blueprint_img) {
        await removeStoredImage(db, existing.data.hover_blueprint_img).catch(() => undefined);
      }

      savedProductId = productId;
    } else {
      const { data, error } = await db
        .from("products")
        .insert({
          ...productRow,
          main_image_url: uploadedMainUrl ?? PRODUCT_PLACEHOLDER,
          hover_blueprint_img: uploadedHoverUrl,
          top_category_images: uploadedTopImages,
          gallery_images: uploadedGallery,
        })
        .select("id")
        .single();

      if (error || !data) {
        await discardUploads(db, [
          uploadedMainUrl,
          uploadedHoverUrl,
          ...Object.values(uploadedTopImages),
          ...uploadedGallery,
        ]);
        return {
          ok: false,
          error: isUniqueViolation(error) ? "That SKU already exists." : "Unable to create product.",
        };
      }

      savedProductId = data.id;
    }

    const { error: pricingError } = await db.from("product_pricing_rules").upsert(
      {
        product_id: savedProductId,
        ...values.costing,
      },
      { onConflict: "product_id" }
    );

    if (pricingError) {
      return { ok: false, error: "Product saved, but the private costing block failed." };
    }

    await writeAudit(db, session.email, {
      action: productId ? "UPDATE" : "CREATE",
      target_table: "products",
      target_id: savedProductId,
      summary: `Product ${values.sku} ${productId ? "updated" : "created"}`,
    });

    revalidateCatalog(values.sku);
    const addAnother = !productId && formString(formData.get("after_save")) === "new";
    redirectTo = addAnother ? "/admin/products/new" : `/admin/products/${savedProductId}`;
  } catch {
    return { ok: false, error: "Unable to save the product. Please try again." };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { ok: false, error: "Unable to save the product." };
}

export async function toggleProductActiveAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const id = formString(formData.get("id"));
    if (!UUID.safeParse(id).success) {
      return { ok: false, error: "Invalid product id." };
    }

    const { data: product, error } = await db
      .from("products")
      .select("id, sku, is_active")
      .eq("id", id)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const nextActive = !product.is_active;
    const { error: updateError } = await db
      .from("products")
      .update({ is_active: nextActive })
      .eq("id", id);

    if (updateError) {
      return { ok: false, error: "Unable to update product status." };
    }

    await writeAudit(db, session.email, {
      action: "UPDATE",
      target_table: "products",
      target_id: id,
      summary: `Product ${product.sku} ${nextActive ? "activated" : "archived"}`,
    });

    revalidateCatalog(product.sku);
    return { ok: true, isActive: nextActive };
  } catch {
    return { ok: false, error: "Unable to update product status." };
  }
}

export async function archiveProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const id = formString(formData.get("id"));
    if (!UUID.safeParse(id).success) {
      return { ok: false, error: "Invalid product id." };
    }

    const { data: product, error } = await db
      .from("products")
      .select("id, sku")
      .eq("id", id)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const { error: updateError } = await db
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (updateError) {
      return { ok: false, error: "Unable to archive product." };
    }

    await writeAudit(db, session.email, {
      action: "ARCHIVE",
      target_table: "products",
      target_id: id,
      summary: `Product ${product.sku} archived`,
    });

    revalidateCatalog(product.sku);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to archive product." };
  }
}

export async function duplicateProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  let redirectTo: string | null = null;

  try {
    const id = formString(formData.get("id"));
    if (!UUID.safeParse(id).success) {
      return { ok: false, error: "Invalid product id." };
    }

    const [productResult, ruleResult, variantResult] = await Promise.all([
      db.from("products").select("*").eq("id", id).maybeSingle(),
      db.from("product_pricing_rules").select("*").eq("product_id", id).maybeSingle(),
      db.from("product_visual_variants").select("*").eq("product_id", id),
    ]);

    if (productResult.error || !productResult.data) {
      return { ok: false, error: "Product not found." };
    }

    const source = productResult.data;
    const baseSku = `${source.sku}-COPY`;
    let newSku = baseSku;
    let counter = 2;

    while (counter < 100) {
      const { data: existing } = await db
        .from("products")
        .select("id")
        .eq("sku", newSku)
        .maybeSingle();

      if (!existing) break;
      newSku = `${baseSku}${counter}`;
      counter += 1;
    }

    const { data: inserted, error: insertError } = await db
      .from("products")
      .insert({
        sku: newSku,
        name: `${source.name} (Copy)`,
        category: source.category,
        product_type: source.product_type,
        base_length_ft: source.base_length_ft,
        base_width_ft: source.base_width_ft,
        allowed_top_categories: source.allowed_top_categories,
        is_knockdown_available: source.is_knockdown_available,
        warranty_text: source.warranty_text,
        main_image_url: PRODUCT_PLACEHOLDER,
        hover_blueprint_img: null,
        is_active: false,
        use_cases: source.use_cases ?? [],
        material_tags: source.material_tags ?? [],
        sort_order: source.sort_order ?? 100,
        top_overlay_note: source.top_overlay_note ?? null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { ok: false, error: "Unable to duplicate product." };
    }

    if (ruleResult.data) {
      const rule = ruleResult.data;
      const { error: ruleError } = await db.from("product_pricing_rules").insert({
        product_id: inserted.id,
        base_pipe_weight_18g_kg: rule.base_pipe_weight_18g_kg,
        top_area_sqft: rule.top_area_sqft,
        consumables_cost: rule.consumables_cost,
        labor_cost: rule.labor_cost,
        overhead_pct: rule.overhead_pct,
        retail_margin_pct: rule.retail_margin_pct,
        b2b_margin_pct: rule.b2b_margin_pct,
      });

      if (ruleError) {
        return { ok: false, error: "Product created, but costing copy failed." };
      }
    }

    const variants = variantResult.data ?? [];
    if (variants.length > 0) {
      const { error: variantError } = await db.from("product_visual_variants").insert(
        variants.map((variant) => ({
          product_id: inserted.id,
          top_material_code: variant.top_material_code,
          frame_color: variant.frame_color,
          preview_image_url: PRODUCT_PLACEHOLDER,
          size_option: variant.size_option,
          size_multiplier: variant.size_multiplier,
          selection_key: variant.selection_key ?? null,
        }))
      );

      if (variantError) {
        return { ok: false, error: "Product created, but variant copy failed." };
      }
    }

    await writeAudit(db, session.email, {
      action: "DUPLICATE",
      target_table: "products",
      target_id: inserted.id,
      summary: `Product ${newSku} duplicated from ${source.sku}`,
    });

    revalidateCatalog(newSku);
    redirectTo = `/admin/products/${inserted.id}`;
  } catch {
    return { ok: false, error: "Unable to duplicate product." };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { ok: false, error: "Unable to duplicate product." };
}

export async function uploadProductImageAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const productId = formString(formData.get("product_id"));
    const kind = formString(formData.get("kind"));
    const file = getUploadFile(formData);

    if (!UUID.safeParse(productId).success || (kind !== "main" && kind !== "hover")) {
      return { ok: false, error: "Invalid image request." };
    }

    if (!file) {
      return { ok: false, error: "Choose an image file first." };
    }

    validateImageSize(file.size);

    const { data: product, error } = await db
      .from("products")
      .select("id, sku, main_image_url, hover_blueprint_img")
      .eq("id", productId)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const processed = await processAdminImage(Buffer.from(await file.arrayBuffer()), true);
    const path = buildStoragePath(product.sku, kind);
    const url = await uploadImageBuffer(db, path, processed.buffer);
    const column = kind === "main" ? "main_image_url" : "hover_blueprint_img";
    const previousUrl =
      kind === "main" ? product.main_image_url : product.hover_blueprint_img;

    const { error: updateError } = await db
      .from("products")
      .update({ [column]: url })
      .eq("id", productId);

    if (updateError) {
      await removeStoredImage(db, url).catch(() => undefined);
      return { ok: false, error: "Image uploaded, but the product update failed." };
    }

    if (kind === "hover" || !(await isImageReferencedByVariant(db, productId, previousUrl))) {
      await removeStoredImage(db, previousUrl).catch(() => undefined);
    }

    await writeAudit(db, session.email, {
      action: "UPLOAD",
      target_table: "products",
      target_id: productId,
      summary: `Image ${kind} uploaded for Product ${product.sku}`,
    });

    revalidateCatalog(product.sku);
    return { ok: true, url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image upload failed. Try a JPG, PNG or WEBP.";
    return { ok: false, error: message };
  }
}

export async function deleteProductImageAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const productId = formString(formData.get("product_id"));
    const kind = formString(formData.get("kind"));

    if (!UUID.safeParse(productId).success || (kind !== "main" && kind !== "hover")) {
      return { ok: false, error: "Invalid image request." };
    }

    const { data: product, error } = await db
      .from("products")
      .select("id, sku, main_image_url, hover_blueprint_img")
      .eq("id", productId)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const column = kind === "main" ? "main_image_url" : "hover_blueprint_img";
    const nextValue = kind === "main" ? PRODUCT_PLACEHOLDER : null;
    const previousUrl =
      kind === "main" ? product.main_image_url : product.hover_blueprint_img;

    const { error: updateError } = await db
      .from("products")
      .update({ [column]: nextValue })
      .eq("id", productId);

    if (updateError) {
      return { ok: false, error: "Unable to remove the image." };
    }

    if (kind === "hover" || !(await isImageReferencedByVariant(db, productId, previousUrl))) {
      await removeStoredImage(db, previousUrl).catch(() => undefined);
    }

    await writeAudit(db, session.email, {
      action: "DELETE_IMAGE",
      target_table: "products",
      target_id: productId,
      summary: `Image ${kind} removed for Product ${product.sku}`,
    });

    revalidateCatalog(product.sku);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to remove the image." };
  }
}

export async function saveVariantAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const rawId = formString(formData.get("id"));
    const variantId = rawId || null;
    const productId = formString(formData.get("product_id"));

    const parsed = VariantFormSchema.safeParse({
      id: variantId,
      product_id: productId,
      top_material_code: formString(formData.get("top_material_code")),
      frame_color: formString(formData.get("frame_color")),
      size_option: formString(formData.get("size_option")),
      selection_key: formString(formData.get("selection_key")) || null,
    });

    if (!parsed.success) {
      return { ok: false, error: "Check the variant fields." };
    }

    const { data: product, error: productError } = await db
      .from("products")
      .select("id, sku, main_image_url")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (productError || !product) {
      return { ok: false, error: "Product not found." };
    }

    let existing: { id: string; preview_image_url: string } | null = null;

    if (variantId) {
      const { data } = await db
        .from("product_visual_variants")
        .select("id, preview_image_url")
        .eq("id", variantId)
        .eq("product_id", product.id)
        .maybeSingle();
      existing = data ?? null;

      if (!existing) {
        return { ok: false, error: "Variant not found." };
      }
    }

    const file = getUploadFile(formData);
    let previewUrl = existing?.preview_image_url ?? product.main_image_url;
    let uploadedUrl: string | null = null;

    if (file) {
      validateImageSize(file.size);
      const processed = await processAdminImage(Buffer.from(await file.arrayBuffer()), true);
      const path = buildStoragePath(product.sku, "variant");
      uploadedUrl = await uploadImageBuffer(db, path, processed.buffer);
      previewUrl = uploadedUrl;
    }

    const variantRow = {
      product_id: product.id,
      top_material_code: parsed.data.top_material_code,
      frame_color: parsed.data.frame_color,
      size_option: parsed.data.size_option,
      selection_key: parsed.data.selection_key ?? null,
      preview_image_url: previewUrl,
    };

    if (variantId) {
      const { error } = await db
        .from("product_visual_variants")
        .update(variantRow)
        .eq("id", variantId)
        .eq("product_id", product.id);

      if (error) {
        if (uploadedUrl) await removeStoredImage(db, uploadedUrl).catch(() => undefined);
        return { ok: false, error: "Unable to update the variant." };
      }
    } else {
      const { error } = await db.from("product_visual_variants").insert({
        ...variantRow,
        size_multiplier: 1.0,
      });

      if (error) {
        if (uploadedUrl) await removeStoredImage(db, uploadedUrl).catch(() => undefined);
        return { ok: false, error: "Unable to add the variant." };
      }
    }

    if (
      uploadedUrl &&
      existing?.preview_image_url &&
      isManagedImage(existing.preview_image_url, "variant")
    ) {
      await removeStoredImage(db, existing.preview_image_url).catch(() => undefined);
    }

    await writeAudit(db, session.email, {
      action: variantId ? "UPDATE" : "CREATE",
      target_table: "product_visual_variants",
      target_id: variantId ?? product.id,
      summary: `Variant ${parsed.data.top_material_code}/${parsed.data.frame_color}/${parsed.data.size_option} for ${product.sku}`,
    });

    revalidateCatalog(product.sku);
    return { ok: true, url: previewUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the variant.";
    return { ok: false, error: message };
  }
}

export async function deleteVariantAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const id = formString(formData.get("id"));
    const productId = formString(formData.get("product_id"));

    if (!UUID.safeParse(id).success || !UUID.safeParse(productId).success) {
      return { ok: false, error: "Invalid variant request." };
    }

    const { data: variant, error } = await db
      .from("product_visual_variants")
      .select("id, preview_image_url")
      .eq("id", id)
      .eq("product_id", productId)
      .maybeSingle();

    if (error || !variant) {
      return { ok: false, error: "Variant not found." };
    }

    const { data: product } = await db
      .from("products")
      .select("sku")
      .eq("id", productId)
      .maybeSingle();

    const { error: deleteError } = await db
      .from("product_visual_variants")
      .delete()
      .eq("id", id)
      .eq("product_id", productId);

    if (deleteError) {
      return { ok: false, error: "Unable to delete the variant." };
    }

    if (isManagedImage(variant.preview_image_url, "variant")) {
      await removeStoredImage(db, variant.preview_image_url).catch(() => undefined);
    }

    await writeAudit(db, session.email, {
      action: "DELETE",
      target_table: "product_visual_variants",
      target_id: id,
      summary: `Variant deleted for ${product?.sku ?? productId}`,
    });

    revalidateCatalog(product?.sku);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to delete the variant." };
  }
}

export async function uploadSwatchAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const optionCode = formString(formData.get("option_code"));
    const file = getUploadFile(formData);

    if (!optionCode || !file) {
      return { ok: false, error: "Choose an option and an image." };
    }

    validateImageSize(file.size);

    const { data: option, error } = await db
      .from("configurator_options")
      .select("option_code, option_group, swatch_texture_img")
      .eq("option_code", optionCode)
      .maybeSingle();

    const swatchGroups = new Set([
      "TOP_MATERIAL",
      "FRAME_COLOR",
      "SEAT_COLOR",
      "FINISH",
      "SS_FINISH",
    ]);

    if (error || !option || !swatchGroups.has(option.option_group)) {
      return { ok: false, error: "Swatch option not found." };
    }

    const processed = await processAdminImage(Buffer.from(await file.arrayBuffer()), false);
    const path = buildStoragePath(optionCode, "swatch", "swatches");
    const url = await uploadImageBuffer(db, path, processed.buffer);

    const { error: updateError } = await db
      .from("configurator_options")
      .update({ swatch_texture_img: url })
      .eq("option_code", optionCode);

    if (updateError) {
      await removeStoredImage(db, url).catch(() => undefined);
      return { ok: false, error: "Swatch uploaded, but the option update failed." };
    }

    await removeStoredImage(db, option.swatch_texture_img).catch(() => undefined);

    await writeAudit(db, session.email, {
      action: "UPLOAD_SWATCH",
      target_table: "configurator_options",
      target_id: optionCode,
      summary: `Swatch ${optionCode} uploaded`,
    });

    revalidateCatalog();
    return { ok: true, url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Swatch upload failed.";
    return { ok: false, error: message };
  }
}

export async function deleteSwatchAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const optionCode = formString(formData.get("option_code"));
    if (!optionCode) {
      return { ok: false, error: "Invalid swatch request." };
    }

    const { data: option, error } = await db
      .from("configurator_options")
      .select("option_code, swatch_texture_img")
      .eq("option_code", optionCode)
      .maybeSingle();

    if (error || !option) {
      return { ok: false, error: "Swatch option not found." };
    }

    const { error: updateError } = await db
      .from("configurator_options")
      .update({ swatch_texture_img: null })
      .eq("option_code", optionCode);

    if (updateError) {
      return { ok: false, error: "Unable to remove the swatch." };
    }

    await removeStoredImage(db, option.swatch_texture_img).catch(() => undefined);

    await writeAudit(db, session.email, {
      action: "DELETE_SWATCH",
      target_table: "configurator_options",
      target_id: optionCode,
      summary: `Swatch ${optionCode} removed`,
    });

    revalidateCatalog();
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to remove the swatch." };
  }
}
