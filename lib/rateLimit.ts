import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { hashIp } from "@/lib/tracking/ip";

export interface SharedRateLimitInput {
  scope: string;
  ip: string;
  limit: number;
  windowMs: number;
  failClosed?: boolean;
}

export function rateLimitKey(scope: string, ip: string): string {
  return `${scope}:${hashIp(ip)}`;
}

export async function checkSharedRateLimit({
  scope,
  ip,
  limit,
  windowMs,
  failClosed = false,
}: SharedRateLimitInput): Promise<boolean> {
  try {
    const db = createServerClient();
    const { data, error } = await db.rpc("check_rate_limit", {
      p_key: rateLimitKey(scope, ip),
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      p_limit: limit,
    });

    if (error) return !failClosed;

    const row = Array.isArray(data) ? data[0] : data;
    return Boolean(row?.allowed);
  } catch {
    return !failClosed;
  }
}

export async function resetSharedRateLimit(
  scope: string,
  ip: string
): Promise<void> {
  try {
    const db = createServerClient();
    await db.from("rate_limits").delete().eq("key", rateLimitKey(scope, ip));
  } catch {
    // Best effort. A failed reset must not expose or block the request.
  }
}
