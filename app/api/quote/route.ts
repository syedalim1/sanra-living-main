import { NextRequest, NextResponse } from "next/server";
import { calculateProductPrice } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      topMaterialCode,
      frameMaterialCode,
      sizeMultiplier,
      customerType,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product identifier is required" },
        { status: 400 }
      );
    }

    const pricing = await calculateProductPrice({
      productId,
      topMaterialCode,
      frameMaterialCode,
      sizeMultiplier: Number(sizeMultiplier) || 1.0,
      customerType: customerType === "B2B" ? "B2B" : "RETAIL",
    });

    return NextResponse.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate live factory price quote",
      },
      { status: 500 }
    );
  }
}
