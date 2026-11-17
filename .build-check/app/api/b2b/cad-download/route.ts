import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/tracking/ip";
import { checkLeadRateLimit } from "@/lib/b2b/rateLimit";
import { CadLeadSchema, hasHoneypot } from "@/lib/b2b/leads";
import { saveLead } from "@/lib/b2b/leadSave";
import { requestCadDownload } from "@/lib/b2b/cadService";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (!checkLeadRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json();
    const parsed = CadLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the required fields and try again." },
        { status: 400, headers: NO_STORE }
      );
    }

    if (hasHoneypot(parsed.data.website)) {
      return NextResponse.json(
        { error: "Request could not be processed." },
        { status: 400, headers: NO_STORE }
      );
    }

    const db = createServerClient();

    const { data: file, error: fileError } = await db
      .from("cad_files")
      .select("id, title, file_type, storage_path, product_sku")
      .eq("id", parsed.data.file_id)
      .eq("is_active", true)
      .maybeSingle();

    if (fileError || !file) {
      return NextResponse.json(
        { error: "CAD model not found." },
        { status: 404, headers: NO_STORE }
      );
    }

    const result = await requestCadDownload({
      saveLead: async () => {
        await saveLead(db, {
          kind: "CAD_DOWNLOAD",
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email ?? null,
          company: parsed.data.company ?? null,
          details: {
            file_title: file.title,
            file_type: file.file_type,
            product_sku: file.product_sku ?? null,
          },
        });
      },
      createSignedUrl: async () => {
        const { data, error } = await db.storage
          .from("cad-files")
          .createSignedUrl(file.storage_path, 300);

        if (error || !data?.signedUrl) {
          throw new Error("Signed URL failed.");
        }

        return data.signedUrl;
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { url: result.url },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not prepare this model download. Please try again." },
      { status: 500, headers: NO_STORE }
    );
  }
}
