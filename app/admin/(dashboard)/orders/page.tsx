import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { Search, Plus, ClipboardList } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/tracking/types";

export const metadata = {
  title: "Orders | SANRA Internal",
};

interface OrdersPageProps {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    archived?: string;
  }>;
}

function stageChip(stage: Stage): string {
  return stage === "READY"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-neutral-100 text-neutral-700 border-neutral-200";
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { q, stage, archived } = await searchParams;

  const queryText = (q ?? "").trim();
  const showArchived = archived === "1";
  const stageFilter = (STAGES as readonly string[]).includes(stage ?? "")
    ? (stage as Stage)
    : null;

  let query = db
    .from("orders")
    .select(
      "id, tracking_code, customer_name_masked, current_stage, balance_due, created_at, archived"
    )
    .eq("archived", showArchived)
    .order("created_at", { ascending: false })
    .limit(200);

  if (stageFilter) {
    query = query.eq("current_stage", stageFilter);
  }

  if (queryText) {
    if (/^\d{4}$/.test(queryText)) {
      query = query.eq("phone_last_4", queryText);
    } else {
      query = query.ilike(
        "tracking_code",
        `%${queryText.replace(/[%_]/g, "")}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load orders.");
  }

  const orders = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
            Orders
          </span>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">
            Factory Orders
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Manage customer orders, stage progression, private WIP photos and warranty
            issuance. Public tracking shows only masked customer details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={showArchived ? "/admin/orders" : "/admin/orders?archived=1"}
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
          >
            {showArchived ? "Show active orders" : "Show archived"}
          </Link>
          <Link
            href="/admin/orders/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] hover:bg-black text-white text-[11px] font-bold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-3xl"
      >
        {showArchived && <input type="hidden" name="archived" value="1" />}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            defaultValue={queryText}
            placeholder="Tracking code or phone last 4"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <select
          name="stage"
          defaultValue={stageFilter ?? ""}
          className="px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold"
        >
          <option value="">All stages</option>
          {STAGES.map((value) => (
            <option key={value} value={value}>
              {STAGE_LABELS[value]}
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

      {orders.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-white border border-neutral-200">
          <ClipboardList className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-800">No orders found</p>
          <p className="text-xs text-neutral-500 mt-1">
            Create a new order or change the search.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Tracking</th>
                  <th className="px-3 py-3 font-bold">Customer</th>
                  <th className="px-3 py-3 font-bold">Stage</th>
                  <th className="px-3 py-3 font-bold">Balance due</th>
                  <th className="px-3 py-3 font-bold">Created</th>
                  <th className="px-4 py-3 font-bold text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <tr key={order.id} className={order.archived ? "bg-neutral-50/60" : "bg-white"}>
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-neutral-900 whitespace-nowrap">
                      {order.tracking_code}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {order.customer_name_masked}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${stageChip(
                          order.current_stage as Stage
                        )}`}
                      >
                        {STAGE_LABELS[order.current_stage as Stage] ??
                          order.current_stage}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-neutral-900">
                      ₹{formatINR(Number(order.balance_due))}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
                      >
                        Open
                      </Link>
                    </td>
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
