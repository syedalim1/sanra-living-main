import {
  maskName,
  maskPhone,
  normalizePhoneLast4,
  normalizeTrackingCode,
} from "@/lib/tracking/mask";
import {
  STAGES,
  type PublicProductLine,
  type PublicTrackingResponse,
  type SignedPhoto,
  type Stage,
  type StageEvent,
  type TrackingOrder,
  type TrackingStore,
  type TrackingVerification,
} from "@/lib/tracking/types";

export const GENERIC_TRACKING_MESSAGE =
  "No order found. Please check your code and phone digits.";

export const TRACKING_LOCK_MESSAGE =
  "Too many attempts. Please try again later or contact us on WhatsApp.";

export const TRACKING_FAILURE_DELAY_MS = 600;
export const TRACKING_MAX_FAILURES = 5;
export const TRACKING_LOCK_WINDOW_MS = 15 * 60 * 1000;

export function isWarrantyEligible(
  order: Pick<TrackingOrder, "current_stage" | "warranty_expiry_date">
): boolean {
  return order.current_stage === "READY" && Boolean(order.warranty_expiry_date);
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export function toPublicProductLines(items: unknown): PublicProductLine[] {
  if (!Array.isArray(items)) return [];

  return items.slice(0, 30).flatMap((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      return name ? [{ name, size: "Standard", quantity: 1 }] : [];
    }

    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    const nameCandidate =
      row.name ?? row.product_name ?? row.sku ?? row.product_sku;

    const name =
      typeof nameCandidate === "string" && nameCandidate.trim()
        ? nameCandidate.trim()
        : "Configured item";

    const sizeCandidate = row.size ?? row.size_label ?? row.configuration_size;
    const size =
      typeof sizeCandidate === "string" && sizeCandidate.trim()
        ? sizeCandidate.trim()
        : "Standard";

    const rawQuantity = Number(row.quantity);
    const quantity =
      Number.isInteger(rawQuantity) && rawQuantity > 0
        ? Math.min(rawQuantity, 999)
        : 1;

    return [{ name, size, quantity }];
  });
}

function buildTimeline(
  order: TrackingOrder,
  events: StageEvent[]
): Array<{ stage: Stage; at: string }> {
  const valid = events
    .filter((event) => isStage(event.stage))
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (valid.length === 0) {
    return [{ stage: order.current_stage, at: order.created_at }];
  }

  return valid.map((event) => ({ stage: event.stage, at: event.at }));
}

export function buildPublicTrackingResponse(input: {
  order: TrackingOrder;
  events: StageEvent[];
  signedPhotos: SignedPhoto[];
}): PublicTrackingResponse {
  const { order, events, signedPhotos } = input;

  return {
    customer_name_masked: maskName(order.customer_name_masked),
    customer_phone_masked: maskPhone(order.phone_last_4),
    current_stage: order.current_stage,
    stage_timeline: buildTimeline(order, events),
    photos: signedPhotos.slice(0, 30).map((photo) => ({
      url: photo.url,
      caption: photo.caption ?? null,
    })),
    product_lines: toPublicProductLines(order.configured_items_json),
    warranty_expiry_date: order.warranty_expiry_date,
    warranty_available: isWarrantyEligible(order),
  };
}

export async function verifyTracking(input: {
  code: string | null | undefined;
  last4: string | null | undefined;
  ipHash: string;
  store: TrackingStore;
  now?: Date;
}): Promise<TrackingVerification> {
  const now = input.now ?? new Date();
  const at = now.toISOString();
  const normalizedCode = normalizeTrackingCode(input.code);
  const normalizedLast4 = normalizePhoneLast4(input.last4);
  const fallbackCode = (input.code ?? "").trim().toUpperCase().slice(0, 40);
  const logCode = normalizedCode ?? (fallbackCode || "UNKNOWN");

  async function log(ok: boolean): Promise<void> {
    try {
      await input.store.logAttempt({
        trackingCode: logCode,
        ipHash: input.ipHash,
        ok,
        at,
      });
    } catch {
      // Never let logging failures reveal or block the generic response.
    }
  }

  if (!normalizedCode || !normalizedLast4) {
    await log(false);
    return { kind: "generic_failure" };
  }

  const since = new Date(now.getTime() - TRACKING_LOCK_WINDOW_MS).toISOString();
  const recentFailures = await input.store.countRecentFailures(
    normalizedCode,
    since
  );

  if (recentFailures >= TRACKING_MAX_FAILURES) {
    await log(false);
    return { kind: "locked" };
  }

  const order = await input.store.findOrderByCode(normalizedCode);

  if (!order || order.phone_last_4 !== normalizedLast4) {
    await log(false);
    return { kind: "generic_failure" };
  }

  await log(true);

  const [events, photos] = await Promise.all([
    input.store.getStageEvents(order.id),
    input.store.getVisiblePhotos(order.id),
  ]);

  return { kind: "success", order, events, photos };
}

export function delayTrackingFailure(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, TRACKING_FAILURE_DELAY_MS)
  );
}
