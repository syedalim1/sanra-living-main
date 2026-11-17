import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createTrackingStore } from "@/lib/tracking/supabaseStore";
import {
  GENERIC_TRACKING_MESSAGE,
  TRACKING_LOCK_MESSAGE,
  delayTrackingFailure,
  isWarrantyEligible,
  verifyTracking,
} from "@/lib/tracking/service";
import { getClientIp, hashIp } from "@/lib/tracking/ip";
import { checkTrackIpRateLimit } from "@/lib/tracking/rateLimit";
import { buildWarrantyPdf } from "@/lib/pdf/warrantyPdf";

const WarrantyRequestSchema = z.object({
  tracking_code: z.string().min(1).max(50),
  phone_last_4: z.string().min(1).max(20),
});

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (!(await checkTrackIpRateLimit(ip))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json();
    const parsed = WarrantyRequestSchema.safeParse(body);

    if (!parsed.success) {
      await delayTrackingFailure();
      return NextResponse.json(
        { error: GENERIC_TRACKING_MESSAGE },
        { status: 404, headers: NO_STORE }
      );
    }

    const db = createServerClient();
    const store = createTrackingStore(db);
    const verification = await verifyTracking({
      code: parsed.data.tracking_code,
      last4: parsed.data.phone_last_4,
      ipHash: hashIp(ip),
      store,
    });

    if (verification.kind === "locked") {
      await delayTrackingFailure();
      return NextResponse.json(
        { error: TRACKING_LOCK_MESSAGE },
        { status: 429, headers: NO_STORE }
      );
    }

    if (verification.kind === "generic_failure") {
      await delayTrackingFailure();
      return NextResponse.json(
        { error: GENERIC_TRACKING_MESSAGE },
        { status: 404, headers: NO_STORE }
      );
    }

    if (!isWarrantyEligible(verification.order)) {
      return NextResponse.json(
        { error: "Warranty certificate is not available yet." },
        { status: 409, headers: NO_STORE }
      );
    }

    const pdfBytes = await buildWarrantyPdf({
      order: verification.order,
      issueDate: new Date(),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SANRA-Warranty-${verification.order.tracking_code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    await delayTrackingFailure();
    return NextResponse.json(
      { error: GENERIC_TRACKING_MESSAGE },
      { status: 404, headers: NO_STORE }
    );
  }
}
