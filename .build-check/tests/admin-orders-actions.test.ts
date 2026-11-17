import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(), storage: {} })),
  supabaseServer: {},
}));

vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

describe("admin order actions", () => {
  it("rejects order creation for a non-admin session", async () => {
    const { createOrderAction } = await import(
      "@/app/admin/(dashboard)/orders/actions"
    );

    await expect(createOrderAction({}, new FormData())).rejects.toThrow(
      "Unauthorized"
    );
  });
});
