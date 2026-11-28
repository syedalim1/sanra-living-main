"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import { invalidatePricingCaches } from "@/lib/pricing/costImport";
import { evaluateVariantPricing } from "@/lib/pricing/variantPricingEngine";
import type { PrivateBulkRule, PrivatePricingProfile, PrivatePricingTier } from "@/lib/variants/types";

export interface PricingRulesActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(50).toUpperCase(),
  name: z.string().trim().min(2).max(100),
  channel: z.enum(["RETAIL", "B2B"]),
  margin_type: z.enum(["GROSS_MARGIN", "MARKUP"]),
  default_margin_pct: z.coerce.number().finite().min(0).max(99.99),
  min_margin_pct: z.coerce.number().finite().min(0).max(99.99).nullable(),
  rounding_rule: z.enum(["NONE", "UP_9", "UP_99", "UP_10", "UP_50", "UP_100", "NEAREST_99"]),
  gst_rate: z.coerce.number().finite().min(0).max(100),
  gst_mode: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
});

export async function savePricingProfileAction(
  _prev: PricingRulesActionState,
  formData: FormData
): Promise<PricingRulesActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const minRaw = String(formData.get("min_margin_pct") ?? "").trim();
  const parsed = ProfileSchema.safeParse({
    id: String(formData.get("id") ?? "").trim() || undefined,
    code: formData.get("code"),
    name: formData.get("name"),
    channel: formData.get("channel"),
    margin_type: formData.get("margin_type"),
    default_margin_pct: formData.get("default_margin_pct"),
    min_margin_pct: minRaw ? minRaw : null,
    rounding_rule: formData.get("rounding_rule"),
    gst_rate: formData.get("gst_rate"),
    gst_mode: formData.get("gst_mode"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Check pricing profile values (margin must be 0–99.99%)." };
  }

  const d = parsed.data;
  if (d.min_margin_pct != null && d.min_margin_pct > d.default_margin_pct) {
    return { ok: false, error: "Minimum margin cannot exceed default margin." };
  }

  const now = new Date().toISOString();
  const { data: saved, error } = await db
    .from("pricing_profiles")
    .upsert(
      {
        ...(d.id ? { id: d.id } : {}),
        code: d.code,
        name: d.name,
        channel: d.channel,
        margin_type: d.margin_type,
        default_margin_pct: d.default_margin_pct,
        min_margin_pct: d.min_margin_pct,
        rounding_rule: d.rounding_rule,
        gst_rate: d.gst_rate,
        gst_mode: d.gst_mode,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();

  if (error || !saved) {
    return { ok: false, error: "Failed to save pricing profile." };
  }

  await db.from("price_history").insert({
    entity_type: "PRICING_PROFILE",
    entity_id: saved.id,
    field: "profile_update",
    old_value: null,
    new_value: `${d.margin_type}:${d.default_margin_pct}% min:${d.min_margin_pct ?? "-"}% ${d.gst_mode} ${d.gst_rate}%`,
    reason: "Admin pricing profile update",
    source: "MANUAL",
    actor_email: session.email,
  });

  await writeAudit(db, session.email, {
    action: "SAVE_PRICING_PROFILE",
    target_table: "pricing_profiles",
    target_id: saved.id,
    summary: `Saved pricing profile ${d.code} (${d.margin_type} ${d.default_margin_pct}%)`,
  });

  invalidatePricingCaches();
  revalidatePath("/admin/pricing-rules");
  revalidatePath("/products");
  return { ok: true, message: `Saved profile ${d.code}.` };
}

const BulkRuleSchema = z.object({
  product_type: z.enum(["TABLE", "CHAIR", "STAND", "RACK", "SS_UNIT", "SET"]),
  min_qty: z.coerce.number().int().min(1).max(10_000),
  below_min_action: z.enum(["SURCHARGE_PCT", "QUOTE_REQUIRED", "BLOCK"]),
  below_min_value: z.coerce.number().finite().min(0).max(500).nullable(),
  special_quote_qty: z.coerce.number().int().min(1).max(10_000).nullable(),
  special_quote_action: z.enum(["QUOTE_REQUIRED", "NONE"]),
  scope: z.enum(["LINE", "BASKET"]),
});

export async function saveBulkRuleAction(
  _prev: PricingRulesActionState,
  formData: FormData
): Promise<PricingRulesActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const belowValRaw = String(formData.get("below_min_value") ?? "").trim();
  const specialQtyRaw = String(formData.get("special_quote_qty") ?? "").trim();

  const parsed = BulkRuleSchema.safeParse({
    product_type: formData.get("product_type"),
    min_qty: formData.get("min_qty"),
    below_min_action: formData.get("below_min_action"),
    below_min_value: belowValRaw ? belowValRaw : null,
    special_quote_qty: specialQtyRaw ? specialQtyRaw : null,
    special_quote_action: formData.get("special_quote_action"),
    scope: formData.get("scope") ?? "LINE",
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid MOQ / bulk rule values." };
  }

  const d = parsed.data;
  if (d.special_quote_qty != null && d.special_quote_qty < d.min_qty) {
    return { ok: false, error: "Special quote threshold must be >= MOQ." };
  }

  const { data: saved, error } = await db
    .from("bulk_rules")
    .upsert(
      {
        product_type: d.product_type,
        min_qty: d.min_qty,
        below_min_action: d.below_min_action,
        below_min_value: d.below_min_value,
        special_quote_qty: d.special_quote_qty,
        special_quote_action: d.special_quote_action,
        scope: d.scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_type" }
    )
    .select("id")
    .single();

  if (error || !saved) {
    return { ok: false, error: "Failed to save bulk rule." };
  }

  await db.from("price_history").insert({
    entity_type: "BULK_RULE",
    entity_id: saved.id,
    field: "bulk_rule_update",
    old_value: null,
    new_value: `MOQ:${d.min_qty} below:${d.below_min_action}(${d.below_min_value ?? 0}) 50+:${d.special_quote_qty ?? "-"}`,
    reason: "Admin bulk rule update",
    source: "MANUAL",
    actor_email: session.email,
  });

  await writeAudit(db, session.email, {
    action: "SAVE_BULK_RULE",
    target_table: "bulk_rules",
    target_id: saved.id,
    summary: `Updated MOQ rule for ${d.product_type}: min ${d.min_qty}`,
  });

  invalidatePricingCaches();
  revalidatePath("/admin/pricing-rules");
  revalidatePath("/products");
  return { ok: true, message: `Updated ${d.product_type} bulk rule.` };
}

const TierSchema = z.object({
  scope: z.enum(["PRODUCT_TYPE", "PRODUCT", "VARIANT"]),
  product_type: z.enum(["TABLE", "CHAIR", "STAND", "RACK", "SS_UNIT", "SET"]).nullable(),
  min_qty: z.coerce.number().int().min(1).max(10_000),
  max_qty: z.coerce.number().int().min(1).max(10_000).nullable(),
  model: z.enum(["DISCOUNT_PCT", "FIXED_UNIT_PRICE", "MARGIN_PCT", "QUOTE_REQUIRED"]),
  value: z.coerce.number().finite().min(0).max(1_000_000).nullable(),
  priority: z.coerce.number().int().min(1).max(1000).default(100),
});

export async function savePricingTierAction(
  _prev: PricingRulesActionState,
  formData: FormData
): Promise<PricingRulesActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const maxRaw = String(formData.get("max_qty") ?? "").trim();
  const valRaw = String(formData.get("value") ?? "").trim();

  const parsed = TierSchema.safeParse({
    scope: formData.get("scope") ?? "PRODUCT_TYPE",
    product_type: formData.get("product_type") || null,
    min_qty: formData.get("min_qty"),
    max_qty: maxRaw ? maxRaw : null,
    model: formData.get("model"),
    value: valRaw ? valRaw : null,
    priority: formData.get("priority") ?? 100,
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid quantity tier values." };
  }

  const d = parsed.data;
  if (d.max_qty != null && d.max_qty < d.min_qty) {
    return { ok: false, error: "Max quantity must be >= Min quantity." };
  }

  const { data: saved, error } = await db
    .from("pricing_tiers")
    .insert({
      scope: d.scope,
      product_type: d.product_type,
      min_qty: d.min_qty,
      max_qty: d.max_qty,
      model: d.model,
      value: d.value,
      priority: d.priority,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !saved) {
    return { ok: false, error: "Failed to create quantity tier." };
  }

  await writeAudit(db, session.email, {
    action: "CREATE_PRICING_TIER",
    target_table: "pricing_tiers",
    target_id: saved.id,
    summary: `Added tier ${d.product_type ?? d.scope} ${d.min_qty}-${d.max_qty ?? "+"} (${d.model})`,
  });

  invalidatePricingCaches();
  revalidatePath("/admin/pricing-rules");
  return { ok: true, message: "Quantity tier added." };
}

export async function deletePricingTierAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const db = createServerClient();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db.from("pricing_tiers").delete().eq("id", id);
  await writeAudit(db, session.email, {
    action: "DELETE_PRICING_TIER",
    target_table: "pricing_tiers",
    target_id: id,
    summary: `Removed pricing tier ${id}`,
  });

  invalidatePricingCaches();
  revalidatePath("/admin/pricing-rules");
}

export interface AdminPricingPreviewOutput {
  ok: boolean;
  error?: string;
  unitPrice?: number | null;
  totalPrice?: number | null;
  gstAmount?: number | null;
  priceBasis?: string | null;
  profitPerUnit?: number | null;
  actualGrossMarginPct?: number | null;
  requiresQuote?: boolean;
  quoteReason?: string | null;
}

export async function previewPricingAction(params: {
  manufacturingCost: number;
  profileId: string;
  productType: string;
  quantity: number;
}): Promise<AdminPricingPreviewOutput> {
  await requireAdmin();
  const db = createServerClient();

  if (!Number.isFinite(params.manufacturingCost) || params.manufacturingCost <= 0) {
    return { ok: false, error: "Enter a positive manufacturing cost." };
  }

  const [{ data: profile }, { data: bulkRule }, { data: tiers }] = await Promise.all([
    db.from("pricing_profiles").select("*").eq("id", params.profileId).maybeSingle(),
    db.from("bulk_rules").select("*").eq("product_type", params.productType).maybeSingle(),
    db
      .from("pricing_tiers")
      .select("*")
      .eq("product_type", params.productType)
      .eq("is_active", true),
  ]);

  if (!profile) {
    return { ok: false, error: "Select a valid pricing profile." };
  }

  const res = evaluateVariantPricing({
    variantId: "preview",
    variantCode: "PREVIEW",
    availability: "MADE_TO_ORDER",
    leadTimeDays: 7,
    sizeCode: "STANDARD",
    quantity: Math.max(1, Math.trunc(params.quantity || 1)),
    pricing: {
      variant_id: "preview",
      manufacturing_cost: params.manufacturingCost,
      cost_source: "MANUAL",
      cost_effective_from: null,
      pricing_profile_id: profile.id,
      price_override_ex_gst: null,
      price_override_inc_gst: null,
      min_selling_price: null,
      internal_notes: null,
      updated_by: null,
      updated_at: new Date().toISOString(),
    },
    profile: profile as PrivatePricingProfile,
    bulkRule: (bulkRule as PrivateBulkRule | null) ?? null,
    tiers: (tiers as PrivatePricingTier[]) ?? [],
  });

  let profitPerUnit: number | null = null;
  let actualGrossMarginPct: number | null = null;
  if (res.unit_price != null && !res.requires_quote) {
    const exGstUnit =
      res.price_basis === "GST_INCLUSIVE" && res.gst_rate != null
        ? res.unit_price / (1 + res.gst_rate / 100)
        : res.unit_price;
    profitPerUnit = Math.round((exGstUnit - params.manufacturingCost) * 100) / 100;
    actualGrossMarginPct =
      exGstUnit > 0
        ? Math.round(((exGstUnit - params.manufacturingCost) / exGstUnit) * 10000) / 100
        : null;
  }

  return {
    ok: true,
    unitPrice: res.unit_price,
    totalPrice: res.total_price,
    gstAmount: res.gst_amount,
    priceBasis: res.price_basis,
    profitPerUnit,
    actualGrossMarginPct,
    requiresQuote: res.requires_quote,
    quoteReason: res.quote_reason,
  };
}
