import { createHash } from "node:crypto";

const IP_SALT =
  process.env.TRACK_IP_SALT ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sanra-tracking-local-salt";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

export function getClientIp(headers: {
  get(name: string): string | null;
}): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
