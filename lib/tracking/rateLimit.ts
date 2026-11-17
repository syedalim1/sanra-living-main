const ipAttempts = new Map<string, { count: number; resetTime: number }>();

export const TRACK_IP_LIMIT = 10;
export const TRACK_IP_WINDOW_MS = 10 * 60 * 1000;

export function checkTrackIpRateLimit(
  ip: string,
  limit = TRACK_IP_LIMIT,
  windowMs = TRACK_IP_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);

  if (!entry || now > entry.resetTime) {
    ipAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function resetTrackIpRateLimitForTests(): void {
  ipAttempts.clear();
}
