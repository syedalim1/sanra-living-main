import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ rpc })),
}));

import { checkSharedRateLimit } from "../lib/rateLimit";

beforeEach(() => {
  rpc.mockReset();
});

describe("shared serverless rate limiter", () => {
  it("returns the database decision", async () => {
    rpc.mockResolvedValueOnce({ data: [{ allowed: true }], error: null });
    await expect(
      checkSharedRateLimit({
        scope: "price",
        ip: "203.0.113.1",
        limit: 30,
        windowMs: 60_000,
      })
    ).resolves.toBe(true);

    rpc.mockResolvedValueOnce({ data: [{ allowed: false }], error: null });
    await expect(
      checkSharedRateLimit({
        scope: "price",
        ip: "203.0.113.1",
        limit: 30,
        windowMs: 60_000,
      })
    ).resolves.toBe(false);
  });

  it("fails open for public routes", async () => {
    rpc.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      checkSharedRateLimit({
        scope: "price",
        ip: "203.0.113.2",
        limit: 30,
        windowMs: 60_000,
      })
    ).resolves.toBe(true);
  });

  it("fails closed for admin login and tracking", async () => {
    rpc.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      checkSharedRateLimit({
        scope: "admin-login",
        ip: "203.0.113.3",
        limit: 5,
        windowMs: 900_000,
        failClosed: true,
      })
    ).resolves.toBe(false);

    rpc.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      checkSharedRateLimit({
        scope: "track-ip",
        ip: "203.0.113.4",
        limit: 10,
        windowMs: 600_000,
        failClosed: true,
      })
    ).resolves.toBe(false);
  });
});
