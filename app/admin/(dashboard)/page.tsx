import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminDashboardPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [productsRes, variantsRes, quotesRes, ordersRes] = await Promise.all([
    db.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    db
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .eq("status", "PUBLISHED")
      .eq("is_active", true),
    db
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .in("status", ["NEW_ENQUIRY", "NEGOTIATION"]),
    db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("archived", false),
  ]);

  const cards = [
    { label: "Active Products", value: productsRes.count ?? 0, href: "/admin/products" },
    { label: "Published Variants", value: variantsRes.count ?? 0, href: "/admin/products" },
    { label: "Open Quotations", value: quotesRes.count ?? 0, href: "/admin/leads" },
    { label: "Active Orders", value: ordersRes.count ?? 0, href: "/admin/orders" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">
          Factory Console Dashboard
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Daily workflow: Create Product → Upload Photos → Generate Variants → Import/Enter Costs → Preview Selling Prices → Publish.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {c.label}
            </p>
            <p className="text-2xl font-black text-[#111111] mt-1">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#111111] text-white font-bold"
          >
            New Product <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/cost-import"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 font-bold text-neutral-800"
          >
            Import Manufacturing Costs
          </Link>
          <Link
            href="/admin/pricing-rules"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 font-bold text-neutral-800"
          >
            Configure Pricing &amp; MOQ Rules
          </Link>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 font-bold text-neutral-800"
          >
            Review Enquiries &amp; Quotations
          </Link>
        </div>
      </div>
    </div>
  );
}
