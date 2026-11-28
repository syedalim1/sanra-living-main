import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { Download, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import LeadsTable from "@/app/admin/(dashboard)/leads/LeadsTable";
import type { AdminLead } from "@/lib/admin/lead-types";
import {
  LEAD_KINDS,
  LEAD_STATUSES,
} from "@/lib/b2b/leads";

export const metadata = {
  title: "Leads | SANRA Internal",
};

interface LeadsPageProps {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    status?: string;
    archived?: string;
  }>;
}

export const instant = false;

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { q, kind, status, archived } = await searchParams;

  const queryText = (q ?? "").trim();
  const showArchived = archived === "1";
  const kindFilter = (LEAD_KINDS as readonly string[]).includes(kind ?? "")
    ? kind
    : null;
  const statusFilter = (LEAD_STATUSES as readonly string[]).includes(status ?? "")
    ? status
    : null;

  let query = db
    .from("leads")
    .select(
      "id, kind, name, phone, email, company, city, details_json, status, archived, created_at"
    )
    .eq("archived", showArchived)
    .order("created_at", { ascending: false })
    .limit(200);

  if (kindFilter) query = query.eq("kind", kindFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const [{ data, error }, { data: quotesData }] = await Promise.all([
    query,
    db
      .from("quotes")
      .select(
        "id, reference, customer_name, phone, city, lead_source, status, total_amount, valid_until, converted_order_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (error) {
    throw new Error("Unable to load leads.");
  }

  const leads: AdminLead[] = (data ?? [])
    .map((lead) => ({
      id: lead.id,
      kind: lead.kind,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
      company: lead.company ?? null,
      city: lead.city ?? null,
      details_json: lead.details_json ?? {},
      status: lead.status,
      archived: Boolean(lead.archived),
      created_at: lead.created_at,
    }))
    .filter((lead) => {
      if (!queryText) return true;
      const haystack = `${lead.name} ${lead.phone}`.toLowerCase();
      return haystack.includes(queryText.toLowerCase());
    });

  const exportParams = new URLSearchParams();
  if (queryText) exportParams.set("q", queryText);
  if (kindFilter) exportParams.set("kind", kindFilter);
  if (statusFilter) exportParams.set("status", statusFilter);
  if (showArchived) exportParams.set("archived", "1");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
            Lead Desk
          </span>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">
            B2B Leads
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Private sample, CAD and bulk quote requests. Never exposed on the
            public site.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={showArchived ? "/admin/leads" : "/admin/leads?archived=1"}
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
          >
            {showArchived ? "Show active leads" : "Show archived"}
          </Link>
          <a
            href={`/api/admin/leads/export?${exportParams.toString()}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-4xl"
      >
        {showArchived && <input type="hidden" name="archived" value="1" />}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            defaultValue={queryText}
            placeholder="Search name or phone"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <select
          name="kind"
          defaultValue={kindFilter ?? ""}
          className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold"
        >
          <option value="">All kinds</option>
          {LEAD_KINDS.map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

      <LeadsTable leads={leads} />

      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#111111]">
            Persistent Quotations &amp; Enquiry Baskets
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track multi-product enquiries, negotiate selling prices, download PDFs, and convert confirmed quotes to orders.
          </p>
        </div>

        {(quotesData ?? []).length === 0 ? (
          <p className="text-xs text-neutral-500">No persistent quotations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Valid Until</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(quotesData ?? []).map((qt) => (
                  <tr key={qt.id} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-3 font-mono font-bold">{qt.reference}</td>
                    <td className="py-2.5 pr-3">
                      {qt.customer_name || qt.phone || "Anonymous"}
                      {qt.city ? ` (${qt.city})` : ""}
                    </td>
                    <td className="py-2.5 pr-3">{qt.lead_source}</td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold">
                        {qt.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">
                      ₹{Number(qt.total_amount ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-500">{qt.valid_until}</td>
                    <td className="py-2.5">
                      <Link
                        href={`/admin/quotes/${qt.id}`}
                        className="font-bold text-[#111111] underline hover:no-underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
