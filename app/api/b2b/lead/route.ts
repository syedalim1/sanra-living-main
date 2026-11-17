import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/tracking/ip";
import { checkLeadRateLimit } from "@/lib/b2b/rateLimit";
import {
  SampleLeadSchema,
  hasHoneypot,
  sanitizeLeadText,
} from "@/lib/b2b/leads";
import { saveLead } from "@/lib/b2b/leadSave";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (!(await checkLeadRateLimit(ip))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json();
    const parsed = SampleLeadSchema.safeParse(body);

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

    await saveLead(db, {
      kind: "SAMPLE_REQUEST",
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      company: parsed.data.company ?? null,
      city: parsed.data.city,
      details: {
        product: sanitizeLeadText(parsed.data.product),
        need: parsed.data.need,
        notes: sanitizeLeadText(parsed.data.notes),
      },
    });

    return NextResponse.json(
      {
        message:
          "Request received. Our team will contact you on WhatsApp shortly.",
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not submit the request. Please try again." },
      { status: 500, headers: NO_STORE }
    );
  }
}
