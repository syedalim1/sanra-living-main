import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestPricingProfile } from "@/lib/admin/variantSetup";

const { from, rpc, requireAdmin, redirect } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  requireAdmin: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(path); }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/admin/auth", () => ({ requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from, rpc }),
  supabaseServer: {},
}));
vi.mock("@/lib/seo/indexNow", () => ({ submitIndexNow: vi.fn() }));

import { saveProductAction, toggleProductActiveAction } from "@/app/admin/(dashboard)/products/actions";
import {
  bulkUpdateVariantsAction,
  saveProductSeoAction,
  saveVariantCostingRowAction,
  toggleProductPublishAction,
} from "@/app/admin/(dashboard)/products/[id]/variant-actions";

const productId = "9c64f616-6c6b-4d7c-b6cd-f6ec0d3bd707";
const variantId = "611c0968-9264-4d1e-bf3c-43bd6ede6156";
const databaseError = { message: "private database error", code: "42501" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

const details = {
  sku: "SANRA-TABLE-12",
  name: "Commercial table",
  category: "SS & MS Tables",
  product_type: "TABLE",
  base_length_ft: "4",
  base_width_ft: "2",
  base_height_ft: "2.5",
  warranty_text: "3-year warranty",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ email: "admin@example.test" });
  rpc.mockResolvedValue({ data: productId, error: null });
  from.mockReturnValue({
    select: () => ({ eq: (column: string) => ({
      maybeSingle: async () => ({
        data: column === "id" ? { id: productId, sku: details.sku, main_image_url: "/photo.webp" } : null,
        error: null,
      }),
    }) }),
  });
});

describe("product editor server actions", () => {
  it("creates a draft with flat-pack disabled and ignores posted publication and legacy prices", async () => {
    await expect(saveProductAction({}, form({
      ...details, is_active: "true", edit_legacy_prices: "on", direct_price: "1200",
    }))).rejects.toThrow(`/admin/products/${productId}`);

    expect(rpc).toHaveBeenCalledWith("admin_save_catalog_product", expect.objectContaining({
      p_id: null,
      p_patch: expect.objectContaining({ is_knockdown_available: false }),
      p_legacy: {},
    }));
    expect(rpc.mock.calls[0][1].p_patch).not.toHaveProperty("is_active");
  });

  it("saves existing products without resubmitting prices or changing publication status", async () => {
    const res = await saveProductAction({}, form({
      ...details, id: productId, direct_price: "1200", is_active: "false",
    }));
    expect(res).toEqual({ ok: true });
    expect(rpc.mock.calls[0][1].p_legacy).toEqual({});
    expect(rpc.mock.calls[0][1].p_patch).not.toHaveProperty("is_active");
  });

  it("shares the server publication guard across list and edit actions", async () => {
    const error = "Upload a main photo before publishing.";
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: error } });

    expect(await toggleProductActiveAction({}, form({ id: productId, is_active: "false" }))).toEqual({ ok: false, error });
    expect(await toggleProductPublishAction({}, form({ id: productId, next_active: "true" }))).toEqual({ ok: false, error });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("admin_publish_catalog_product", expect.objectContaining({ p_id: productId, p_active: true, p_expected_active: false }));
  });

  it("returns actionable failure states for unsuccessful saves without exposing database errors", async () => {
    rpc.mockResolvedValue({ data: null, error: databaseError });
    const row = form({
      product_id: productId, variant_id: variantId, manufacturing_cost: "1500.25",
      availability: "MADE_TO_ORDER", status: "PUBLISHED", variant_revision: "2026-11-28T00:00:00+00:00",
    });

    expect(await saveProductAction({}, form({ ...details, id: productId }))).toEqual({ ok: false, error: "Unable to save product details." });
    expect(await saveVariantCostingRowAction({}, row)).toEqual({ ok: false, error: "Unable to save variant costing." });
    expect(await bulkUpdateVariantsAction({}, form({
      product_id: productId, variant_ids: variantId, lead_time_days: "0",
    }))).toEqual({ ok: false, error: "Unable to apply the bulk update." });
    expect(await saveProductSeoAction({}, form({ product_id: productId }))).toEqual({ ok: false, error: "Unable to save SEO fields." });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("pricing-profile suggestions", () => {
  const retail = { channel: "RETAIL", is_active: true, default_margin_pct: 25 } as const;
  const profile = (code: string, name: string) => ({ id: code, code, name, ...retail });
  const profiles = [
    profile("SS_RETAIL", "Stainless steel"),
    profile("SS_TABLE", "Stainless steel tables"),
    profile("MS_CHAIR", "Mild steel chairs"),
    profile("MS_SET", "Mild steel chair & table combo"),
    { ...profile("SS_CHAIR_INACTIVE", "SS chairs"), is_active: false },
    { ...profile("MS_TABLE_BULK", "MS table"), channel: "B2B" as const },
    { ...profile("MS_UNCONFIGURED", "MS retail"), default_margin_pct: null },
  ];

  it("prefers an active configured material/type match with a material-specific retail fallback", () => {
    expect(suggestPricingProfile(profiles, "SS", "TABLE")).toBe("SS_TABLE");
    expect(suggestPricingProfile(profiles, "SS", "CHAIR")).toBe("SS_RETAIL");
    expect(suggestPricingProfile(profiles, "MS", "CHAIR_TABLE_SET")).toBe("MS_SET");
    expect(suggestPricingProfile(profiles, "MS", "TABLE")).toBeNull();
  });

  it("leaves equally specific matches for the admin to choose", () => {
    expect(suggestPricingProfile([...profiles, profile("SS_TABLE_ALT", "SS table")], "SS", "TABLE")).toBeNull();
  });
});
