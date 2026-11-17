import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { truncateAuditSummary } from "@/lib/admin/guard";

export interface AuditEntry {
  action: string;
  target_table: string;
  target_id: string;
  summary: string;
}

export async function writeAudit(
  db: SupabaseClient,
  actorEmail: string,
  entry: AuditEntry
): Promise<void> {
  const { error } = await db.from("admin_audit_log").insert({
    actor_email: actorEmail,
    action: entry.action,
    target_table: entry.target_table,
    target_id: entry.target_id,
    summary: truncateAuditSummary(entry.summary),
  });

  if (error) {
    throw new Error("Audit log write failed.");
  }
}
