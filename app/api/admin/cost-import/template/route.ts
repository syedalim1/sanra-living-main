import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { generateCostImportTemplateCsv } from "@/lib/pricing/costImport";

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = generateCostImportTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sanra-cost-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
