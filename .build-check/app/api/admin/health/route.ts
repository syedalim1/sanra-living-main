import { NextResponse, connection } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";

export async function GET() {
  await connection();
  const session = await requireAdminApi();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, email: session.email },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
