import type { Stage } from "@/lib/tracking/types";

export interface OrderLineItem {
  name: string;
  size: string;
  configuration: string;
  quantity: number;
}

export interface AdminOrder {
  id: string;
  tracking_code: string;
  customer_name_full: string | null;
  customer_name_masked: string;
  customer_phone_full: string;
  phone_last_4: string;
  configured_items_json: unknown;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  current_stage: Stage;
  warranty_years: number;
  warranty_expiry_date: string | null;
  delivered_on: string | null;
  notes_internal: string | null;
  archived: boolean;
  created_at: string;
}

export interface AdminOrderEvent {
  id: string;
  stage: Stage;
  at: string;
  note: string | null;
}

export interface AdminOrderPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  at: string;
  is_visible_to_customer: boolean;
  signed_url?: string | null;
}

export interface OrderActionResult {
  ok?: boolean;
  error?: string;
  id?: string;
  stage?: Stage;
}
