import "server-only";
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  await connection();

  try {
    const supabase = createServerClient();
    // Read one row count from products table only
    const { error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Strictly returns only {"ok": true} - never exposes row counts, keys, or private table data
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
