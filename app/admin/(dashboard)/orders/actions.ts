"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import {
  formString,
  parseBoolean,
  parseNumber,
  validateImageSize,
} from "@/lib/admin/validation";
import { processAdminImage } from "@/lib/admin/images";
import {
  buildOrderPhotoPath,
  removeOrderPhoto,
  uploadOrderPhoto,
} from "@/lib/admin/orderImages";
import {
  AdvanceAmountSchema,
  OrderArchiveSchema,
  OrderCreateSchema,
  OrderPhotoDeleteSchema,
  OrderPhotoSchema,
  OrderPhotoVisibilitySchema,
  OrderStageSchema,
  OrderUndoSchema,
  OrderUpdateSchema,
  calculateBalance,
  calculateWarrantyExpiry,
  getNextStage,
  parseItemsJson,
} from "@/lib/admin/orderValidation";
import type { OrderActionResult } from "@/lib/admin/order-types";
import { maskName, normalizePhoneFull } from "@/lib/tracking/mask";
import type { Stage } from "@/lib/tracking/types";

function revalidateOrders(orderId?: string): void {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/audit");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

function getUploadFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}

function parseOrderForm(formData: FormData) {
  const phoneDigits = normalizePhoneFull(formString(formData.get("customer_phone_full")));
  const phone =
    phoneDigits.length === 12 && phoneDigits.startsWith("91")
      ? phoneDigits.slice(2)
      : phoneDigits;

  return {
    customer_name_full: formString(formData.get("customer_name_full")),
    customer_phone_full: phone,
    notes_internal: formString(formData.get("notes_internal")) || null,
    items: parseItemsJson(formString(formData.get("items_json"))),
    total_amount: parseNumber(formData.get("total_amount")),
    advance_paid: parseNumber(formData.get("advance_paid")),
    warranty_years: Math.trunc(parseNumber(formData.get("warranty_years"), 10)),
    delivered_on: formString(formData.get("delivered_on")) || null,
  };
}

export async function createOrderAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  let redirectTo: string | null = null;

  try {
    const parsed = OrderCreateSchema.safeParse(parseOrderForm(formData));
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the order fields.",
      };
    }

    const values = parsed.data;
    const balance = calculateBalance(values.total_amount, values.advance_paid);

    const { data, error } = await db
      .from("orders")
      .insert({
        customer_name_full: values.customer_name_full,
        customer_name_masked: maskName(values.customer_name_full),
        customer_phone_full: values.customer_phone_full,
        phone_last_4: values.customer_phone_full.slice(-4),
        configured_items_json: values.items,
        total_amount: values.total_amount,
        advance_paid: values.advance_paid,
        balance_due: balance,
        current_stage: "PIPE_CUT",
        warranty_years: values.warranty_years,
        warranty_expiry_date: null,
        delivered_on: null,
        notes_internal: values.notes_internal || null,
        archived: false,
      })
      .select("id, tracking_code")
      .single();

    if (error || !data) {
      return { ok: false, error: "Unable to create the order." };
    }

    const { error: eventError } = await db.from("order_stage_events").insert({
      order_id: data.id,
      stage: "PIPE_CUT",
      note: "Order created",
    });

    if (eventError) {
      return { ok: false, error: "Order created, but the first stage event failed." };
    }

    await writeAudit(db, session.email, {
      action: "CREATE",
      target_table: "orders",
      target_id: data.id,
      summary: `Order ${data.tracking_code} created`,
    });

    revalidateOrders(data.id);
    redirectTo = `/admin/orders/${data.id}`;
  } catch {
    return { ok: false, error: "Unable to create the order. Please try again." };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { ok: false, error: "Unable to create the order." };
}

export async function updateOrderAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const orderId = formString(formData.get("order_id"));
    const parsed = OrderUpdateSchema.safeParse(parseOrderForm(formData));

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the order fields.",
      };
    }

    const { data: current, error: currentError } = await db
      .from("orders")
      .select(
        "id, tracking_code, current_stage, delivered_on, warranty_years"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (currentError || !current) {
      return { ok: false, error: "Order not found." };
    }

    const values = parsed.data;
    const isReady = current.current_stage === "READY";
    const deliveredOn = isReady
      ? values.delivered_on ?? current.delivered_on
      : null;

    if (isReady && !deliveredOn) {
      return { ok: false, error: "A delivery date is required for a ready order." };
    }

    const warrantyExpiry = isReady
      ? calculateWarrantyExpiry(deliveredOn, values.warranty_years)
      : null;
    const balance = calculateBalance(values.total_amount, values.advance_paid);

    const { error } = await db
      .from("orders")
      .update({
        customer_name_full: values.customer_name_full,
        customer_name_masked: maskName(values.customer_name_full),
        customer_phone_full: values.customer_phone_full,
        phone_last_4: values.customer_phone_full.slice(-4),
        configured_items_json: values.items,
        total_amount: values.total_amount,
        advance_paid: values.advance_paid,
        balance_due: balance,
        warranty_years: values.warranty_years,
        warranty_expiry_date: warrantyExpiry,
        delivered_on: deliveredOn,
        notes_internal: values.notes_internal || null,
      })
      .eq("id", orderId);

    if (error) {
      return { ok: false, error: "Unable to update the order." };
    }

    await writeAudit(db, session.email, {
      action: "UPDATE",
      target_table: "orders",
      target_id: orderId,
      summary: `Order ${current.tracking_code} updated`,
    });

    revalidateOrders(orderId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update the order. Please try again." };
  }
}

export async function moveStageAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderStageSchema.safeParse({
      order_id: formString(formData.get("order_id")),
      next_stage: formString(formData.get("next_stage")),
      note: formString(formData.get("note")) || null,
      delivered_on: formString(formData.get("delivered_on")) || null,
    });

    if (!parsed.success) {
      return { ok: false, error: "Check the stage details." };
    }

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, tracking_code, current_stage, warranty_years")
      .eq("id", parsed.data.order_id)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false, error: "Order not found." };
    }

    const next = getNextStage(order.current_stage as Stage);
    if (!next) {
      return { ok: false, error: "This order is already ready." };
    }

    if (parsed.data.next_stage !== next) {
      return { ok: false, error: "Move one stage at a time." };
    }

    let deliveredOn: string | null = null;
    let warrantyExpiry: string | null = null;

    if (next === "READY") {
      if (!parsed.data.delivered_on) {
        return { ok: false, error: "Add the delivery date before marking Ready." };
      }
      deliveredOn = parsed.data.delivered_on;
      warrantyExpiry = calculateWarrantyExpiry(
        deliveredOn,
        order.warranty_years ?? 10
      );

      if (!warrantyExpiry) {
        return { ok: false, error: "The delivery date is invalid." };
      }
    }

    const { error: eventError } = await db.from("order_stage_events").insert({
      order_id: order.id,
      stage: next,
      note: parsed.data.note || null,
    });

    if (eventError) {
      return { ok: false, error: "Unable to add the stage event." };
    }

    const { error: updateError } = await db
      .from("orders")
      .update({
        current_stage: next,
        warranty_expiry_date: warrantyExpiry,
        delivered_on: deliveredOn,
      })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false, error: "Stage event saved, but the order update failed." };
    }

    await writeAudit(db, session.email, {
      action: "STAGE",
      target_table: "orders",
      target_id: order.id,
      summary: `Order ${order.tracking_code} moved ${order.current_stage} -> ${next}`,
    });

    revalidateOrders(order.id);
    return { ok: true, stage: next };
  } catch {
    return { ok: false, error: "Unable to move the stage. Please try again." };
  }
}

export async function undoStageAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderUndoSchema.safeParse({
      order_id: formString(formData.get("order_id")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid order." };
    }

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, tracking_code, current_stage")
      .eq("id", parsed.data.order_id)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false, error: "Order not found." };
    }

    const { data: events, error: eventsError } = await db
      .from("order_stage_events")
      .select("id, stage, at")
      .eq("order_id", order.id)
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .limit(2);

    if (eventsError || !events || events.length === 0) {
      return { ok: false, error: "No stage event to undo." };
    }

    const latest = events[0];
    if (latest.stage === "PIPE_CUT") {
      return { ok: false, error: "Cannot undo the first stage." };
    }

    const previous = events[1];
    const newStage = (previous?.stage ?? "PIPE_CUT") as Stage;

    const { error: deleteError } = await db
      .from("order_stage_events")
      .delete()
      .eq("id", latest.id)
      .eq("order_id", order.id);

    if (deleteError) {
      return { ok: false, error: "Unable to undo the stage." };
    }

    const { error: updateError } = await db
      .from("orders")
      .update({
        current_stage: newStage,
        warranty_expiry_date: null,
        delivered_on: null,
      })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false, error: "Stage event removed, but the order update failed." };
    }

    await writeAudit(db, session.email, {
      action: "UNDO_STAGE",
      target_table: "orders",
      target_id: order.id,
      summary: `Order ${order.tracking_code} stage undone ${latest.stage} -> ${newStage}`,
    });

    revalidateOrders(order.id);
    return { ok: true, stage: newStage };
  } catch {
    return { ok: false, error: "Unable to undo the stage. Please try again." };
  }
}

export async function uploadOrderPhotoAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderPhotoSchema.safeParse({
      order_id: formString(formData.get("order_id")),
      caption: formString(formData.get("caption")) || null,
      is_visible_to_customer: parseBoolean(
        formData.get("is_visible_to_customer")
      ),
    });

    if (!parsed.success) {
      return { ok: false, error: "Check the photo fields." };
    }

    const file = getUploadFile(formData);
    if (!file) {
      return { ok: false, error: "Choose a photo first." };
    }

    validateImageSize(file.size);

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, tracking_code")
      .eq("id", parsed.data.order_id)
      .maybeSingle();

    if (orderError || !order) {
      return { ok: false, error: "Order not found." };
    }

    const processed = await processAdminImage(
      Buffer.from(await file.arrayBuffer()),
      true
    );
    const path = buildOrderPhotoPath(order.tracking_code);
    await uploadOrderPhoto(db, path, processed.buffer);

    const { data: photo, error } = await db
      .from("order_photos")
      .insert({
        order_id: order.id,
        storage_path: path,
        caption: parsed.data.caption || null,
        is_visible_to_customer: parsed.data.is_visible_to_customer,
      })
      .select("id")
      .single();

    if (error || !photo) {
      await removeOrderPhoto(db, path).catch(() => undefined);
      return { ok: false, error: "Photo uploaded, but the record failed." };
    }

    await writeAudit(db, session.email, {
      action: "UPLOAD_PHOTO",
      target_table: "order_photos",
      target_id: photo.id,
      summary: `Order ${order.tracking_code} photo added`,
    });

    revalidateOrders(order.id);
    return { ok: true, id: photo.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload the photo.";
    return { ok: false, error: message };
  }
}

export async function deleteOrderPhotoAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderPhotoDeleteSchema.safeParse({
      photo_id: formString(formData.get("photo_id")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid photo." };
    }

    const { data: photo, error } = await db
      .from("order_photos")
      .select("id, order_id, storage_path")
      .eq("id", parsed.data.photo_id)
      .maybeSingle();

    if (error || !photo) {
      return { ok: false, error: "Photo not found." };
    }

    await removeOrderPhoto(db, photo.storage_path);

    const { error: deleteError } = await db
      .from("order_photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      return { ok: false, error: "Unable to delete the photo record." };
    }

    const { data: order } = await db
      .from("orders")
      .select("tracking_code")
      .eq("id", photo.order_id)
      .maybeSingle();

    await writeAudit(db, session.email, {
      action: "DELETE_PHOTO",
      target_table: "order_photos",
      target_id: photo.id,
      summary: `Order ${order?.tracking_code ?? photo.order_id} photo removed`,
    });

    revalidateOrders(photo.order_id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to delete the photo." };
  }
}

export async function toggleOrderPhotoVisibilityAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderPhotoVisibilitySchema.safeParse({
      photo_id: formString(formData.get("photo_id")),
      is_visible_to_customer: parseBoolean(
        formData.get("is_visible_to_customer")
      ),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid photo." };
    }

    const { data: photo, error } = await db
      .from("order_photos")
      .select("id, order_id")
      .eq("id", parsed.data.photo_id)
      .maybeSingle();

    if (error || !photo) {
      return { ok: false, error: "Photo not found." };
    }

    const { error: updateError } = await db
      .from("order_photos")
      .update({ is_visible_to_customer: parsed.data.is_visible_to_customer })
      .eq("id", photo.id);

    if (updateError) {
      return { ok: false, error: "Unable to update photo visibility." };
    }

    await writeAudit(db, session.email, {
      action: "UPDATE_PHOTO_VISIBILITY",
      target_table: "order_photos",
      target_id: photo.id,
      summary: `Photo visibility ${
        parsed.data.is_visible_to_customer ? "shown" : "hidden"
      }`,
    });

    revalidateOrders(photo.order_id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update photo visibility." };
  }
}

export async function markAdvanceReceivedAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = AdvanceAmountSchema.safeParse({
      order_id: formString(formData.get("order_id")),
      amount: parseNumber(formData.get("amount")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Enter a valid advance amount." };
    }

    const { data: order, error } = await db
      .from("orders")
      .select("id, tracking_code, total_amount, advance_paid")
      .eq("id", parsed.data.order_id)
      .maybeSingle();

    if (error || !order) {
      return { ok: false, error: "Order not found." };
    }

    const total = Number(order.total_amount);
    const nextAdvance = Math.min(
      total,
      Math.round((Number(order.advance_paid) + parsed.data.amount) * 100) / 100
    );
    const balance = calculateBalance(total, nextAdvance);

    const { error: updateError } = await db
      .from("orders")
      .update({ advance_paid: nextAdvance, balance_due: balance })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false, error: "Unable to update the advance." };
    }

    await writeAudit(db, session.email, {
      action: "ADVANCE",
      target_table: "orders",
      target_id: order.id,
      summary: `Order ${order.tracking_code} advance updated`,
    });

    revalidateOrders(order.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update the advance." };
  }
}

export async function toggleOrderArchiveAction(
  _prevState: OrderActionResult,
  formData: FormData
): Promise<OrderActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = OrderArchiveSchema.safeParse({
      order_id: formString(formData.get("order_id")),
      archived: parseBoolean(formData.get("archived")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid order." };
    }

    const { data: order, error } = await db
      .from("orders")
      .select("id, tracking_code")
      .eq("id", parsed.data.order_id)
      .maybeSingle();

    if (error || !order) {
      return { ok: false, error: "Order not found." };
    }

    const { error: updateError } = await db
      .from("orders")
      .update({ archived: parsed.data.archived })
      .eq("id", order.id);

    if (updateError) {
      return { ok: false, error: "Unable to update the archive state." };
    }

    await writeAudit(db, session.email, {
      action: parsed.data.archived ? "ARCHIVE" : "UNARCHIVE",
      target_table: "orders",
      target_id: order.id,
      summary: `Order ${order.tracking_code} ${
        parsed.data.archived ? "archived" : "restored"
      }`,
    });

    revalidateOrders(order.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update the archive state." };
  }
}
