import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { signOrderPhotoRecords } from "@/lib/tracking/storage";
import { STAGE_LABELS, type Stage } from "@/lib/tracking/types";
import { getNextStage } from "@/lib/admin/orderValidation";
import type {
  AdminOrder,
  AdminOrderEvent,
  AdminOrderPhoto,
} from "@/lib/admin/order-types";
import OrderForm from "@/app/admin/(dashboard)/orders/OrderForm";
import OrderStagePanel from "@/app/admin/(dashboard)/orders/[id]/OrderStagePanel";
import OrderAdvanceForm from "@/app/admin/(dashboard)/orders/[id]/OrderAdvanceForm";
import OrderPhotosManager from "@/app/admin/(dashboard)/orders/[id]/OrderPhotosManager";
import OrderShareButtons from "@/app/admin/(dashboard)/orders/[id]/OrderShareButtons";
import OrderArchiveButton from "@/app/admin/(dashboard)/orders/[id]/OrderArchiveButton";

export const metadata = {
  title: "Order Detail | SANRA Internal",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const [orderResult, eventResult, photoResult] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db
      .from("order_stage_events")
      .select("id, stage, at, note")
      .eq("order_id", id)
      .order("at", { ascending: true }),
    db
      .from("order_photos")
      .select("id, storage_path, caption, at, is_visible_to_customer")
      .eq("order_id", id)
      .order("at", { ascending: false }),
  ]);

  if (orderResult.error || !orderResult.data) {
    notFound();
  }

  const row = orderResult.data;
  const order: AdminOrder = {
    id: row.id,
    tracking_code: row.tracking_code,
    customer_name_full: row.customer_name_full ?? null,
    customer_name_masked: row.customer_name_masked,
    customer_phone_full: row.customer_phone_full,
    phone_last_4: row.phone_last_4,
    configured_items_json: row.configured_items_json,
    total_amount: Number(row.total_amount),
    advance_paid: Number(row.advance_paid),
    balance_due: Number(row.balance_due),
    current_stage: row.current_stage as Stage,
    warranty_years: Number(row.warranty_years ?? 10),
    warranty_expiry_date: row.warranty_expiry_date ?? null,
    delivered_on: row.delivered_on ?? null,
    notes_internal: row.notes_internal ?? null,
    archived: Boolean(row.archived),
    created_at: row.created_at,
  };

  const events: AdminOrderEvent[] = (eventResult.data ?? []).map((event) => ({
    id: event.id,
    stage: event.stage as Stage,
    at: event.at,
    note: event.note ?? null,
  }));

  const photoRecords = (photoResult.data ?? []).map((photo) => ({
    storage_path: photo.storage_path,
    caption: photo.caption ?? null,
    at: photo.at,
  }));

  const signedPhotos = await signOrderPhotoRecords(db, photoRecords);
  const signedByPath = new Map(
    signedPhotos.map((photo) => [photo.storage_path, photo.signed_url])
  );

  const photos: AdminOrderPhoto[] = (photoResult.data ?? []).map((photo) => ({
    id: photo.id,
    storage_path: photo.storage_path,
    caption: photo.caption ?? null,
    at: photo.at,
    is_visible_to_customer: Boolean(photo.is_visible_to_customer),
    signed_url: signedByPath.get(photo.storage_path) ?? null,
  }));

  const nextStage = getNextStage(order.current_stage);

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to orders
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              Order {order.tracking_code}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-widest">
                {order.customer_name_masked}
              </span>
              <span className="px-2 py-0.5 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                {STAGE_LABELS[order.current_stage]}
              </span>
              {order.archived && (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold uppercase tracking-widest">
                  Archived
                </span>
              )}
              <span className="text-[10px] text-neutral-500">
                Created{" "}
                {new Date(order.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2">
            <OrderShareButtons
              code={order.tracking_code}
              customerPhone={order.customer_phone_full}
              stage={order.current_stage}
            />
            <OrderArchiveButton orderId={order.id} archived={order.archived} />
          </div>
        </div>
      </div>

      <OrderStagePanel
        orderId={order.id}
        currentStage={order.current_stage}
        nextStage={nextStage}
        events={events}
      />

      <OrderAdvanceForm
        orderId={order.id}
        total={order.total_amount}
        advance={order.advance_paid}
        balance={order.balance_due}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">Edit Order</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Tracking code is permanent. All other customer, item and warranty fields
            are editable.
          </p>
        </div>
        <OrderForm mode="edit" order={order} />
      </section>

      <OrderPhotosManager orderId={order.id} photos={photos} />
    </div>
  );
}
