import "server-only";

import { revalidatePath } from "next/cache";
import { invalidatePricingCaches } from "@/lib/pricing/costImport";
import { submitIndexNow } from "@/lib/seo/indexNow";
import { productPath } from "@/lib/site";
import { createServerClient } from "@/lib/supabase/server";

export function catalogWriteError(error: { code?: string; message: string } | null, fallback: string) {
  if (error?.code === "P0001") return error.message;
  if (error?.code === "P0002") return "Product not found.";
  return fallback;
}

export function refreshCatalogProduct(id: string) {
  invalidatePricingCaches();
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/audit");
  revalidatePath("/products");
  revalidatePath("/products/[sku]", "page");
}

export async function setCatalogPublication(id: string, active: boolean, actor: string) {
  try {
    const db = createServerClient();
    const { data: sku, error } = await db.rpc("admin_publish_catalog_product", {
      p_id: id,
      p_active: active,
      p_expected_active: !active,
      p_actor: actor,
    });

    if (error || typeof sku !== "string") {
      return { ok: false, error: catalogWriteError(error, "Unable to update publication status.") };
    }

    refreshCatalogProduct(id);
    revalidatePath(productPath(sku));
    await submitIndexNow([productPath(sku), "/products"]);
    return { ok: true, isActive: active, message: active ? "Product published." : "Product moved to draft." };
  } catch {
    return { ok: false, error: "Unable to update publication status." };
  }
}
