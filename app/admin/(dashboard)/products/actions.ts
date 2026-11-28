"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import { catalogWriteError, setCatalogPublication } from "@/lib/admin/productWorkflow";
import { PRODUCT_PLACEHOLDER } from "@/lib/admin/product-types";
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
  removeStoredImage,
  uploadImageFile,
} from "@/lib/admin/images";
import type { AdminActionResult } from "@/lib/admin/product-types";

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
  return await uploadImageFile(db, buildStoragePath(sku, kind), file);
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
  const [visual, catalog] = await Promise.all([
    db.from("product_visual_variants").select("id").eq("product_id", productId).eq("preview_image_url", url).limit(1),
    db.from("product_variants").select("id").eq("product_id", productId).eq("variant_image_url", url).limit(1),
  ]);

  // Keep the asset when a failed lookup cannot establish that it is unused.
  return Boolean(visual.error || catalog.error || visual.data?.length || catalog.data?.length);
}

export async function saveProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  let redirectTo: string | null = null;

  try {
    const db = createServerClient();
    const rawId = formString(formData.get("id"));
    const productId = rawId || null;

    if (productId && !UUID.safeParse(productId).success) {
      return { ok: false, error: "Invalid product id." };
    }

    const productType = formString(formData.get("product_type"));
    const editingLegacy = Boolean(productId && parseBoolean(formData.get("edit_legacy_prices")));
    const legacyNumber = (field: string) => {
      const value = formString(formData.get(field)).trim();
      return editingLegacy && value ? Number(value) : undefined;
    };

    const parsed = ProductFormSchema.safeParse({
      sku: formString(formData.get("sku")),
      name: formString(formData.get("name")),
      category: formString(formData.get("category")),
      product_type: productType,
      base_length_ft: parseNumber(formData.get("base_length_ft")),
      base_width_ft: parseNumber(formData.get("base_width_ft")),
      base_height_ft: parseNumber(formData.get("base_height_ft"), 2.5),
      short_description: formString(formData.get("short_description")),
      pipe_spec: formString(formData.get("pipe_spec")),
      frame_material: (formString(formData.get("frame_material")) || "MS").toUpperCase(),
      use_cases: formStringArray(formData, "use_cases"),
      material_tags: formStringArray(formData, "material_tags"),
      sort_order: Math.trunc(parseNumber(formData.get("sort_order"), 100)),
      warranty_text: formString(formData.get("warranty_text")),
      is_knockdown_available: parseBoolean(formData.get("is_knockdown_available")),
      allowed_top_categories: formStringArray(formData, "allowed_top_categories"),
      direct_price: legacyNumber("direct_price"),
      granite_top_price: legacyNumber("granite_top_price"),
      wood_top_price: legacyNumber("wood_top_price"),
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

    const existing = productId
      ? await db.from("products")
          .select("id, sku, main_image_url, hover_blueprint_img, top_category_images")
          .eq("id", productId)
          .maybeSingle()
      : null;
    if (existing?.error) return { ok: false, error: "Unable to load the product." };
    if (productId && !existing?.data) return { ok: false, error: "Product not found." };
    if (existing?.data && existing.data.sku !== values.sku) {
      return { ok: false, error: "The model number is locked after creation." };
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

    const legacyPatch: Record<string, unknown> = {};
    for (const field of ["direct_price", "granite_top_price", "wood_top_price"] as const) {
      if (values[field] != null) legacyPatch[field] = values[field];
    }
    if (editingLegacy && values.pipe_spec) {
      legacyPatch.pipe_spec = values.pipe_spec;
    }
    if (["CHAIR_TABLE_SET", "BENCH_DESK"].includes(values.product_type) && formData.has("set_configuration")) {
      legacyPatch.combo_config = {
        set_configuration: formString(formData.get("set_configuration")).slice(0, 160),
        seating_type: formString(formData.get("seating_type")).slice(0, 160),
        chair_quantity: Math.min(1000, Math.max(0, Math.trunc(parseNumber(formData.get("chair_quantity"))))),
      };
    }

    const topPatch: Record<string, string | null> = { ...uploadedTopImages };
    for (const { key } of topImageFields) {
      if (productId && !topPatch[key] && parseBoolean(formData.get(`remove_top_${key.toLowerCase()}_image`))) {
        topPatch[key] = null;
      }
    }

    const nextMain = uploadedMainUrl ?? (!productId || removeMainImage ? PRODUCT_PLACEHOLDER : undefined);
    const nextHover = uploadedHoverUrl ?? (!productId || removeHoverImage ? null : undefined);
    const productPatch = {
      sku: values.sku,
      name: values.name,
      category: values.category,
      product_type: values.product_type,
      base_length_ft: values.base_length_ft,
      base_width_ft: values.base_width_ft,
      base_height_ft: values.base_height_ft,
      allowed_top_categories: values.allowed_top_categories,
      frame_material: values.frame_material,
      short_description: values.short_description || null,
      is_knockdown_available: values.is_knockdown_available,
      warranty_text: values.warranty_text,
      use_cases: values.use_cases,
      material_tags: values.material_tags,
      sort_order: values.sort_order,
      main_image_url: nextMain,
      hover_blueprint_img: nextHover,
      top_category_images: !productId || Object.keys(topPatch).length > 0 ? topPatch : undefined,
      gallery_images: !productId || uploadedGallery.length > 0 ? uploadedGallery : undefined,
    };

    const { data: savedProductId, error } = await db.rpc("admin_save_catalog_product", {
      p_id: productId,
      p_patch: productPatch,
      p_legacy: legacyPatch,
      p_actor: session.email,
    });

    if (error || typeof savedProductId !== "string") {
      if (error?.code) {
        await discardUploads(db, [uploadedMainUrl, uploadedHoverUrl, ...Object.values(uploadedTopImages), ...uploadedGallery]);
      }
      return {
        ok: false,
        error: isUniqueViolation(error) ? "That model number already exists."
          : error?.code === "P0001" ? error.message
          : productId ? "Unable to save product details." : "Unable to create the draft.",
      };
    }

    const previous = existing?.data;
    if (previous && productId) {
      const oldPhotos = [
        nextMain !== undefined ? previous.main_image_url : null,
        nextHover !== undefined ? previous.hover_blueprint_img : null,
        ...Object.keys(topPatch).map((key) => previous.top_category_images?.[key] as string | undefined),
      ];
      for (const url of new Set(oldPhotos)) {
        if (url && !Object.values(topPatch).includes(url) && url !== nextMain && url !== nextHover &&
          !(await isImageReferencedByVariant(db, productId, url))) {
          await discardUploads(db, [url]);
        }
      }
    }

    revalidateCatalog(values.sku);
    revalidatePath(`/admin/products/${savedProductId}`);
    if (productId) return { ok: true };
    redirectTo = formString(formData.get("after_save")) === "new"
      ? `/admin/products/new?created=${savedProductId}`
      : `/admin/products/${savedProductId}`;
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
  const id = formString(formData.get("id"));
  const current = formString(formData.get("is_active"));
  if (!UUID.safeParse(id).success || !["true", "false"].includes(current)) {
    return { ok: false, error: "Invalid product status request." };
  }
  return setCatalogPublication(id, current !== "true", session.email);
}

export async function archiveProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const id = formString(formData.get("id"));
  if (!UUID.safeParse(id).success) return { ok: false, error: "Invalid product id." };
  return setCatalogPublication(id, false, session.email);
}

export async function duplicateProductAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  const id = formString(formData.get("id"));
  if (!UUID.safeParse(id).success) return { ok: false, error: "Invalid product id." };

  let draftId: string;
  try {
    const db = createServerClient();
    const { data, error } = await db.rpc("admin_duplicate_catalog_product", {
      p_id: id,
      p_actor: session.email,
    });
    if (error || typeof data !== "string") {
      return { ok: false, error: catalogWriteError(error, "Unable to duplicate product.") };
    }
    draftId = data;
    revalidateCatalog();
  } catch {
    return { ok: false, error: "Unable to duplicate product." };
  }

  redirect(`/admin/products/${draftId}`);
}

export async function uploadProductImageAction(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const session = await requireAdmin();

  try {
    const db = createServerClient();
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
      .select("id, sku, main_image_url, hover_blueprint_img, is_active")
      .eq("id", productId)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const url = await uploadImageFile(db, buildStoragePath(product.sku, kind), file);
    const column = kind === "main" ? "main_image_url" : "hover_blueprint_img";
    const previousUrl =
      kind === "main" ? product.main_image_url : product.hover_blueprint_img;

    const { error: updateError } = await db
      .from("products")
      .update({ [column]: url })
      .eq("id", productId)
      .select("id")
      .single();

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

  try {
    const db = createServerClient();
    const productId = formString(formData.get("product_id"));
    const kind = formString(formData.get("kind"));

    if (!UUID.safeParse(productId).success || (kind !== "main" && kind !== "hover")) {
      return { ok: false, error: "Invalid image request." };
    }

    const { data: product, error } = await db
      .from("products")
      .select("id, sku, main_image_url, hover_blueprint_img, is_active")
      .eq("id", productId)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    if (kind === "main" && product.is_active) {
      return { ok: false, error: "Unpublish the product before removing its main photo." };
    }

    const column = kind === "main" ? "main_image_url" : "hover_blueprint_img";
    const nextValue = kind === "main" ? PRODUCT_PLACEHOLDER : null;
    const previousUrl =
      kind === "main" ? product.main_image_url : product.hover_blueprint_img;

    const { error: updateError } = await db
      .from("products")
      .update({ [column]: nextValue })
      .eq("id", productId)
      .eq("is_active", product.is_active)
      .select("id")
      .single();

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

  try {
    const db = createServerClient();
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
      const { data, error } = await db
        .from("product_visual_variants")
        .select("id, preview_image_url")
        .eq("id", variantId)
        .eq("product_id", product.id)
        .maybeSingle();
      if (error) return { ok: false, error: "Unable to load the variant." };
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
      uploadedUrl = await uploadImageFile(db, buildStoragePath(product.sku, "variant"), file);
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
        .eq("product_id", product.id)
        .select("id")
        .single();

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

  try {
    const db = createServerClient();
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

    const { data: product, error: productError } = await db
      .from("products")
      .select("sku")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) return { ok: false, error: "Unable to load the product." };

    const { error: deleteError } = await db
      .from("product_visual_variants")
      .delete()
      .eq("id", id)
      .eq("product_id", productId)
      .select("id")
      .single();

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

  try {
    const db = createServerClient();
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

    const url = await uploadImageFile(db, buildStoragePath(optionCode, "swatch", "swatches"), file);

    const { error: updateError } = await db
      .from("configurator_options")
      .update({ swatch_texture_img: url })
      .eq("option_code", optionCode)
      .select("option_code")
      .single();

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

  try {
    const db = createServerClient();
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
      .eq("option_code", optionCode)
      .select("option_code")
      .single();

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
