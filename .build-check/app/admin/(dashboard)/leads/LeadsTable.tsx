"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  archiveLeadAction,
  updateLeadStatusAction,
} from "@/app/admin/(dashboard)/leads/actions";
import type {
  AdminLead,
  LeadActionResult,
} from "@/lib/admin/lead-types";
import { LEAD_STATUSES } from "@/lib/b2b/leads";

const initial: LeadActionResult = {};

function kindLabel(kind: string): string {
  if (kind === "SAMPLE_REQUEST") return "Sample";
  if (kind === "CAD_DOWNLOAD") return "CAD";
  return "Bulk Quote";
}

export default function LeadsTable({ leads }: { leads: AdminLead[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  const [, statusAction, statusPending] = useActionState(
    async (previous: LeadActionResult, formData: FormData) => {
      const result = await updateLeadStatusAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Lead status updated." });
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to update lead status.",
        });
      }
      return result;
    },
    initial
  );

  const [, archiveAction, archivePending] = useActionState(
    async (previous: LeadActionResult, formData: FormData) => {
      const result = await archiveLeadAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Lead archive updated." });
        setSelectedId(null);
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to update the archive state.",
        });
      }
      return result;
    },
    initial
  );

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setToast({ kind: "success", message: "Phone copied." });
    } catch {
      window.prompt("Copy phone", phone);
    }
  };

  return (
    <>
      {leads.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-white border border-neutral-200">
          <p className="text-sm font-bold text-neutral-800">No leads found</p>
          <p className="text-xs text-neutral-500 mt-1">
            Change the filters or wait for a new B2B request.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Kind</th>
                  <th className="px-3 py-3 font-bold">Name</th>
                  <th className="px-3 py-3 font-bold">Phone</th>
                  <th className="px-3 py-3 font-bold">Company / City</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Created</th>
                  <th className="px-4 py-3 font-bold text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className={lead.archived ? "bg-neutral-50/60" : "bg-white"}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-600">
                        {kindLabel(lead.kind)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-neutral-900">
                      {lead.name}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-neutral-600">
                      {lead.phone}
                    </td>
                    <td className="px-3 py-3 text-neutral-600">
                      {lead.company || "—"}
                      {lead.city ? ` • ${lead.city}` : ""}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                          lead.status === "NEW"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : lead.status === "CONTACTED"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-neutral-100 text-neutral-500 border-neutral-200"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(lead.id)}
                        className="px-2.5 py-1.5 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <button
            type="button"
            aria-label="Close lead details"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {kindLabel(selected.kind)} lead
                </p>
                <h2 className="text-base font-black text-[#111111] mt-1">
                  {selected.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close lead details"
                className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  ["Phone", selected.phone],
                  ["Email", selected.email || "—"],
                  ["Company", selected.company || "—"],
                  ["City", selected.city || "—"],
                  ["Kind", kindLabel(selected.kind)],
                  ["Status", selected.status],
                  ["Archived", selected.archived ? "Yes" : "No"],
                  [
                    "Received",
                    new Date(selected.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="p-3 rounded-lg bg-neutral-50 border border-neutral-200"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      {label}
                    </p>
                    <p className="text-[11px] font-semibold text-neutral-900 mt-1 break-words">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[9px] font-mono text-neutral-400 break-all">
                Lead ID: {selected.id}
              </p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/91${selected.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                    "Hi, this is SANRA LIVING regarding your project enquiry."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Open WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => copyPhone(selected.phone)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy phone
                </button>
              </div>

              <form action={statusAction} className="space-y-2">
                <input type="hidden" name="lead_id" value={selected.id} />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Status
                </label>
                <div className="flex gap-2">
                  <select
                    name="status"
                    defaultValue={selected.status}
                    className="flex-1 px-3 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={statusPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
                  >
                    {statusPending && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    Save
                  </button>
                </div>
              </form>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Details
                </p>
                <pre className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-[10px] leading-relaxed text-neutral-700 whitespace-pre-wrap break-words">
                  {JSON.stringify(selected.details_json ?? {}, null, 2)}
                </pre>
              </div>

              <form
                action={archiveAction}
                onSubmit={(event) => {
                  if (
                    !selected.archived &&
                    !window.confirm("Archive this lead? It stays in the database.")
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="lead_id" value={selected.id} />
                <input
                  type="hidden"
                  name="archived"
                  value={String(!selected.archived)}
                />
                <button
                  type="submit"
                  disabled={archivePending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {archivePending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : selected.archived ? (
                    <ArchiveRestore className="w-3 h-3" />
                  ) : (
                    <Archive className="w-3 h-3" />
                  )}
                  {selected.archived ? "Restore" : "Archive"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
