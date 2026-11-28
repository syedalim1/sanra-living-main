import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import QuoteDetailClient from "./QuoteDetailClient";

export const instant = false;

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { id } = await params;

  const [{ data: quote }, { data: items }] = await Promise.all([
    db.from("quotes").select("*").eq("id", id).maybeSingle(),
    db
      .from("quote_items")
      .select(
        "id, sku, product_name, public_snapshot_json, quantity, unit_price, negotiated_unit_price, line_total, requires_quote"
      )
      .eq("quote_id", id)
      .order("created_at"),
  ]);

  if (!quote) notFound();

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Enquiries &amp; Quotations
      </Link>

      <QuoteDetailClient quote={quote} items={items ?? []} />
    </div>
  );
}
