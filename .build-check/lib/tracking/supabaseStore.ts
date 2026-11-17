import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PhotoRecord,
  Stage,
  StageEvent,
  TrackingOrder,
  TrackingStore,
} from "@/lib/tracking/types";

export function createTrackingStore(db: SupabaseClient): TrackingStore {
  return {
    async findOrderByCode(code: string): Promise<TrackingOrder | null> {
      const { data, error } = await db
        .from("orders")
        .select(
          "id, tracking_code, customer_name_masked, phone_last_4, current_stage, configured_items_json, warranty_years, warranty_expiry_date, created_at, archived"
        )
        .eq("tracking_code", code)
        .maybeSingle();

      if (error || !data) return null;
      return data as TrackingOrder;
    },

    async countRecentFailures(code: string, sinceIso: string): Promise<number> {
      const { count, error } = await db
        .from("tracking_attempts")
        .select("*", { count: "exact", head: true })
        .eq("tracking_code", code)
        .eq("ok", false)
        .gte("at", sinceIso);

      if (error) throw new Error("Tracking attempt lookup failed.");
      return count ?? 0;
    },

    async logAttempt(input): Promise<void> {
      const { error } = await db.from("tracking_attempts").insert({
        tracking_code: input.trackingCode,
        ip_hash: input.ipHash,
        ok: input.ok,
        at: input.at,
      });

      if (error) throw new Error("Tracking attempt log failed.");
    },

    async getStageEvents(orderId: string): Promise<StageEvent[]> {
      const { data, error } = await db
        .from("order_stage_events")
        .select("stage, at, note")
        .eq("order_id", orderId)
        .order("at", { ascending: true });

      if (error || !data) return [];
      return data.map((row) => ({
        stage: row.stage as Stage,
        at: row.at,
        note: row.note,
      }));
    },

    async getVisiblePhotos(orderId: string): Promise<PhotoRecord[]> {
      const { data, error } = await db
        .from("order_photos")
        .select("storage_path, caption, at")
        .eq("order_id", orderId)
        .eq("is_visible_to_customer", true)
        .order("at", { ascending: false });

      if (error || !data) return [];
      return data as PhotoRecord[];
    },
  };
}
