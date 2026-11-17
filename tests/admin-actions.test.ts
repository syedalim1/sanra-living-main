import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(), storage: {} })),
  supabaseServer: {},
}));

vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

describe("admin save actions", () => {
  it("rejects the Rate Master save action for a non-admin session", async () => {
    const { saveRatesAction } = await import("@/app/admin/(dashboard)/rates/actions");

    await expect(
      saveRatesAction({
        materialRates: [{ code: "GRANITE_GALAXY", value: 999 }],
        globals: [],
        options: [],
        confirmLarge: true,
      })
    ).rejects.toThrow("Unauthorized");
  });
});
