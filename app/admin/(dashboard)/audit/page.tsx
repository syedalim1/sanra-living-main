import "server-only";

import { ScrollText } from "lucide-react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Audit Log | SANRA Internal",
};

function formatAuditTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminAuditPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const { data, error } = await db
    .from("admin_audit_log")
    .select("id, at, actor_email, action, target_table, target_id, summary")
    .order("at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load audit log.");
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
          Audit
        </span>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">Audit Log</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Read-only history of admin create, update and delete actions. Latest 200 entries.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-white border border-neutral-200">
          <ScrollText className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-800">No audit entries yet</p>
          <p className="text-xs text-neutral-500 mt-1">
            Rate and product changes will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Time</th>
                  <th className="px-3 py-3 font-bold">Actor</th>
                  <th className="px-3 py-3 font-bold">Action</th>
                  <th className="px-3 py-3 font-bold">Target</th>
                  <th className="px-4 py-3 font-bold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-4 py-3 text-[11px] text-neutral-500 whitespace-nowrap">
                      {formatAuditTime(row.at)}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-neutral-600">{row.actor_email}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-neutral-100 text-[9px] font-bold uppercase tracking-wider text-neutral-700">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-neutral-600">
                      <p className="font-mono">{row.target_table ?? "—"}</p>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {row.target_id ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-800">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
