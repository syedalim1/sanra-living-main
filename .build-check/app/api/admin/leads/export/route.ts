import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  LEAD_KINDS,
  LEAD_STATUSES,
} from "@/lib/b2b/leads";

function csvCell(value: unknown): string {
  const text =
    value == null
      ? ""
      : typeof value === "string"
      ? value
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  await connection();
  const session = await requireAdminApi();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const db = createServerClient();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const kindParam = req.nextUrl.searchParams.get("kind") ?? "";
  const statusParam = req.nextUrl.searchParams.get("status") ?? "";
  const showArchived = req.nextUrl.searchParams.get("archived") === "1";

  const kind = (LEAD_KINDS as readonly string[]).includes(kindParam)
    ? kindParam
    : null;
  const status = (LEAD_STATUSES as readonly string[]).includes(statusParam)
    ? statusParam
    : null;

  let query = db
    .from("leads")
    .select(
      "kind, name, phone, email, company, city, status, created_at"
    )
    .eq("archived", showArchived)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Unable to export leads." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rows = (data ?? []).filter((lead) => {
    if (!q) return true;
    return `${lead.name} ${lead.phone}`
      .toLowerCase()
      .includes(q.toLowerCase());
  });

  const header = [
    "Kind",
    "Name",
    "Phone",
    "Email",
    "Company",
    "City",
    "Status",
    "Created at",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((lead) =>
      [
        lead.kind,
        lead.name,
        lead.phone,
        lead.email,
        lead.company,
        lead.city,
        lead.status,
        lead.created_at,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="SANRA-Leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
