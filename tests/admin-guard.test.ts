import { describe, expect, it } from "vitest";
import {
  ADMIN_IDLE_MS,
  assertAdminActor,
  decideAdminAccess,
  isAdminEmail,
  isAdminSessionExpired,
} from "../lib/admin/guard";

describe("admin authorization guard", () => {
  it("matches the admin email exactly and case-insensitively", () => {
    expect(isAdminEmail("Owner@Example.com", "owner@example.com")).toBe(true);
    expect(isAdminEmail("owner@example.com", " OWNER@EXAMPLE.COM ")).toBe(true);
    expect(isAdminEmail("owner+other@example.com", "owner@example.com")).toBe(false);
    expect(isAdminEmail("owner@example.co", "owner@example.com")).toBe(false);
    expect(isAdminEmail("", "owner@example.com")).toBe(false);
    expect(isAdminEmail("owner@example.com", "")).toBe(false);
  });

  it("rejects a non-admin actor before any admin service runs", () => {
    expect(() => assertAdminActor("staff@other.com", "owner@example.com")).toThrow(
      "Unauthorized"
    );
    expect(assertAdminActor("OWNER@example.com", "owner@example.com")).toBe(
      "owner@example.com"
    );
  });

  it("expires a session after eight hours of inactivity", () => {
    const now = Date.now();
    expect(isAdminSessionExpired(null, now)).toBe(true);
    expect(isAdminSessionExpired(now - ADMIN_IDLE_MS + 1000, now)).toBe(false);
    expect(isAdminSessionExpired(now - ADMIN_IDLE_MS - 1000, now)).toBe(true);
  });

  it("redirects unauthenticated page requests and returns 401 for API requests", () => {
    expect(
      decideAdminAccess({
        pathname: "/admin/rates",
        email: null,
        lastSeenMs: null,
        adminEmail: "owner@example.com",
      })
    ).toBe("login");

    expect(
      decideAdminAccess({
        pathname: "/api/admin/health",
        email: null,
        lastSeenMs: null,
        adminEmail: "owner@example.com",
      })
    ).toBe("unauthorized");
  });

  it("redirects non-admin and stale sessions", () => {
    expect(
      decideAdminAccess({
        pathname: "/admin/rates",
        email: "staff@other.com",
        lastSeenMs: Date.now(),
        adminEmail: "owner@example.com",
      })
    ).toBe("login");

    expect(
      decideAdminAccess({
        pathname: "/admin/rates",
        email: "owner@example.com",
        lastSeenMs: Date.now() - ADMIN_IDLE_MS - 1,
        adminEmail: "owner@example.com",
      })
    ).toBe("login");
  });

  it("allows a valid admin session with recent activity", () => {
    expect(
      decideAdminAccess({
        pathname: "/api/admin/health",
        email: "owner@example.com",
        lastSeenMs: Date.now(),
        adminEmail: "owner@example.com",
      })
    ).toBe("allow");
  });
});
