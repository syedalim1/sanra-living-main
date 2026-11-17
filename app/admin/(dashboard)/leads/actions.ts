"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import {
  LeadArchiveInputSchema,
  LeadStatusInputSchema,
} from "@/lib/admin/leadValidation";
import type { LeadActionResult } from "@/lib/admin/lead-types";
import { formString, parseBoolean } from "@/lib/admin/validation";

function revalidateLeads(): void {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/audit");
}

export async function updateLeadStatusAction(
  _prevState: LeadActionResult,
  formData: FormData
): Promise<LeadActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = LeadStatusInputSchema.safeParse({
      lead_id: formString(formData.get("lead_id")),
      status: formString(formData.get("status")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Choose a valid lead status." };
    }

    const { data: lead, error } = await db
      .from("leads")
      .select("id, status")
      .eq("id", parsed.data.lead_id)
      .maybeSingle();

    if (error || !lead) {
      return { ok: false, error: "Lead not found." };
    }

    const { error: updateError } = await db
      .from("leads")
      .update({ status: parsed.data.status })
      .eq("id", lead.id);

    if (updateError) {
      return { ok: false, error: "Unable to update lead status." };
    }

    await writeAudit(db, session.email, {
      action: "UPDATE",
      target_table: "leads",
      target_id: lead.id,
      summary: `Lead ${lead.id.slice(0, 8)} status ${lead.status} -> ${parsed.data.status}`,
    });

    revalidateLeads();
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update lead status." };
  }
}

export async function archiveLeadAction(
  _prevState: LeadActionResult,
  formData: FormData
): Promise<LeadActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = LeadArchiveInputSchema.safeParse({
      lead_id: formString(formData.get("lead_id")),
      archived: parseBoolean(formData.get("archived")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid lead." };
    }

    const { data: lead, error } = await db
      .from("leads")
      .select("id")
      .eq("id", parsed.data.lead_id)
      .maybeSingle();

    if (error || !lead) {
      return { ok: false, error: "Lead not found." };
    }

    const { error: updateError } = await db
      .from("leads")
      .update({ archived: parsed.data.archived })
      .eq("id", lead.id);

    if (updateError) {
      return { ok: false, error: "Unable to update the lead archive state." };
    }

    await writeAudit(db, session.email, {
      action: parsed.data.archived ? "ARCHIVE" : "UNARCHIVE",
      target_table: "leads",
      target_id: lead.id,
      summary: `Lead ${lead.id.slice(0, 8)} ${
        parsed.data.archived ? "archived" : "restored"
      }`,
    });

    revalidateLeads();
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to update the lead archive state." };
  }
}
