export const STAGES = [
  "PIPE_CUT",
  "WELDED",
  "COATED",
  "MASTER_CHECKED",
  "READY",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  PIPE_CUT: "Pipe Cut",
  WELDED: "Welded",
  COATED: "Coated",
  MASTER_CHECKED: "Master Checked",
  READY: "Ready",
};

export interface TrackingOrder {
  id: string;
  tracking_code: string;
  customer_name_masked: string;
  phone_last_4: string;
  current_stage: Stage;
  configured_items_json: unknown;
  warranty_years: number;
  warranty_expiry_date: string | null;
  created_at: string;
  archived: boolean;
}

export interface StageEvent {
  stage: Stage;
  at: string;
  note?: string | null;
}

export interface PhotoRecord {
  storage_path: string;
  caption: string | null;
  at: string;
}

export interface SignedPhoto {
  url: string;
  caption: string | null;
}

export interface TrackingStore {
  findOrderByCode(code: string): Promise<TrackingOrder | null>;
  countRecentFailures(code: string, sinceIso: string): Promise<number>;
  logAttempt(input: {
    trackingCode: string;
    ipHash: string;
    ok: boolean;
    at: string;
  }): Promise<void>;
  getStageEvents(orderId: string): Promise<StageEvent[]>;
  getVisiblePhotos(orderId: string): Promise<PhotoRecord[]>;
}

export type TrackingVerification =
  | { kind: "generic_failure" }
  | { kind: "locked" }
  | {
      kind: "success";
      order: TrackingOrder;
      events: StageEvent[];
      photos: PhotoRecord[];
    };

export interface PublicProductLine {
  name: string;
  size: string;
  quantity: number;
}

export interface PublicTrackingResponse {
  customer_name_masked: string;
  customer_phone_masked: string;
  current_stage: Stage;
  stage_timeline: Array<{ stage: Stage; at: string }>;
  photos: SignedPhoto[];
  product_lines: PublicProductLine[];
  warranty_expiry_date: string | null;
  warranty_available: boolean;
}
