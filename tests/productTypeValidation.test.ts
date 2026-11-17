import { describe, expect, it } from "vitest";
import {
  ChairSelectionsSchema,
  NonTableConfigSchema,
  StandSelectionsSchema,
} from "../lib/schemas";

const validChair = {
  METAL_TYPE: "MS_COATED" as const,
  SEAT: "SEAT_RUBBER" as const,
  FRAME_COLOR: "MATTE_BLACK" as const,
  BUILD_TYPE: "WELDED" as const,
};

describe("product type selection validation", () => {
  it("accepts a valid chair and stand selection", () => {
    expect(ChairSelectionsSchema.safeParse(validChair).success).toBe(true);
    expect(
      StandSelectionsSchema.safeParse({
        STAND_MATERIAL: "ST_MS",
        PACK: "PACK_1",
        BASE: "BASE_BUSH",
      }).success
    ).toBe(true);
  });

  it("rejects a rexine color on a rubberwood seat", () => {
    const result = ChairSelectionsSchema.safeParse({
      ...validChair,
      SEAT_COLOR: "REXINE_TAN",
    });

    expect(result.success).toBe(false);
  });

  it("rejects frame color on stainless steel and requires it on MS", () => {
    expect(
      ChairSelectionsSchema.safeParse({
        ...validChair,
        METAL_TYPE: "SS304",
        FRAME_COLOR: "MATTE_BLACK",
      }).success
    ).toBe(false);

    expect(
      ChairSelectionsSchema.safeParse({
        METAL_TYPE: "MS_COATED",
        SEAT: "SEAT_RUBBER",
        BUILD_TYPE: "WELDED",
      }).success
    ).toBe(false);
  });

  it("rejects granite or table-only groups for chairs and stands", () => {
    expect(
      ChairSelectionsSchema.safeParse({
        ...validChair,
        TOP_TAB: "STONE",
        TOP_MATERIAL: "GRANITE_JET_BLACK_OPT",
      }).success
    ).toBe(false);

    expect(
      StandSelectionsSchema.safeParse({
        STAND_MATERIAL: "ST_MS",
        PACK: "PACK_1",
        BASE: "BASE_BUSH",
        WOOD: "WOOD_RUBBER_18",
        STONE: "GRANITE_GALAXY",
      }).success
    ).toBe(false);
  });

  it("builds a discriminated union from the server-loaded product type", () => {
    expect(
      NonTableConfigSchema.safeParse({
        product_type: "CHAIR",
        sku: "IMS-CH-01",
        quantity: 1,
        selections: validChair,
      }).success
    ).toBe(true);

    expect(
      NonTableConfigSchema.safeParse({
        product_type: "STAND",
        sku: "IMS-ST-12",
        quantity: 1,
        selections: validChair,
      }).success
    ).toBe(false);
  });
});
