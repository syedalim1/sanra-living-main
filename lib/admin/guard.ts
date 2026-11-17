export const ADMIN_LAST_SEEN_COOKIE = "sanra_admin_last_seen";
export const ADMIN_IDLE_MS = 8 * 60 * 60 * 1000;
export const ADMIN_LOGIN_PATH = "/admin/login";

export type AdminAccessDecision = "allow" | "login" | "unauthorized";

export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | null | undefined = process.env.ADMIN_EMAIL
): boolean {
  if (!email || !adminEmail) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAdmin = adminEmail.trim().toLowerCase();
  return normalizedEmail.length > 0 && normalizedEmail === normalizedAdmin;
}

export function assertAdminActor(
  actorEmail: string | null | undefined,
  adminEmail: string | null | undefined = process.env.ADMIN_EMAIL
): string {
  if (!isAdminEmail(actorEmail, adminEmail)) {
    throw new Error("Unauthorized");
  }
  return actorEmail!.trim().toLowerCase();
}

export function isAdminSessionExpired(
  lastSeenMs: number | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!lastSeenMs || !Number.isFinite(lastSeenMs) || lastSeenMs <= 0) return true;
  return nowMs - lastSeenMs > ADMIN_IDLE_MS;
}

export function isAdminPagePath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

export function decideAdminAccess(input: {
  pathname: string;
  email: string | null | undefined;
  lastSeenMs: number | null | undefined;
  adminEmail?: string | null;
  nowMs?: number;
}): AdminAccessDecision {
  const api = isAdminApiPath(input.pathname);

  if (!isAdminEmail(input.email, input.adminEmail)) {
    return api ? "unauthorized" : "login";
  }

  if (isAdminSessionExpired(input.lastSeenMs, input.nowMs)) {
    return api ? "unauthorized" : "login";
  }

  return "allow";
}

export function truncateAuditSummary(summary: string, maxLength = 180): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}
