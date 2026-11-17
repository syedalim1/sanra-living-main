import "server-only";
import { checkSharedRateLimit } from "@/lib/rateLimit";

export const TRACK_IP_LIMIT = 10;
export const TRACK_IP_WINDOW_MS = 10 * 60 * 1000;

export async function checkTrackIpRateLimit(
  ip: string,
  failClosed = false
): Promise<boolean> {
  return await checkSharedRateLimit({
    scope: "track-ip",
    ip,
    limit: TRACK_IP_LIMIT,
    windowMs: TRACK_IP_WINDOW_MS,
    failClosed,
  });
}
