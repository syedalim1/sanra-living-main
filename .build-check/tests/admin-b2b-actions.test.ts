import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(), storage: {} })),
  supabaseServer: {},
}));

vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

describe("admin B2B actions", () => {
  it("rejects lead status updates for a non-admin session", async () => {
    const { updateLeadStatusAction } = await import(
      "@/app/admin/(dashboard)/leads/actions"
    );

    await expect(updateLeadStatusAction({}, new FormData())).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("rejects CAD uploads for a non-admin session", async () => {
    const { saveCadFileAction } = await import(
      "@/app/admin/(dashboard)/cad/actions"
    );

    await expect(saveCadFileAction({}, new FormData())).rejects.toThrow(
      "Unauthorized"
    );
  });
});
