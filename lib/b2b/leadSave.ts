import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  nullableText,
  sanitizeLeadText,
  type LeadKind,
} from "@/lib/b2b/leads";

export interface LeadToSave {
  kind: LeadKind;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  city?: string | null;
  details: Record<string, unknown>;
}

export async function saveLead(
  db: SupabaseClient,
  lead: LeadToSave
): Promise<void> {
  const { error } = await db.from("leads").insert({
    kind: lead.kind,
    name: sanitizeLeadText(lead.name),
    phone: lead.phone.replace(/\D/g, ""),
    email: nullableText(lead.email),
    company: nullableText(lead.company),
    city: nullableText(lead.city),
    details_json: lead.details,
    status: "NEW",
    archived: false,
  });

  if (error) {
    throw new Error("Lead save failed.");
  }
}
