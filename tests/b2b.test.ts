import { describe, expect, it, vi } from "vitest";
import {
  BulkPriceRequestSchema,
  nonTableInputFromBulkRow,
  priceBulkRows,
  tableInputFromBulkRow,
  type BulkRowInput,
} from "../lib/b2b/bulk";
import {
  calculateRoomLayout,
  type RoomTableSize,
} from "../lib/b2b/roomCalculator";
import { requestCadDownload } from "../lib/b2b/cadService";

const validChairRow: BulkRowInput = {
  sku: "IMS-CH-01",
  quantity: 2,
  selections: {
    METAL_TYPE: "MS_COATED",
    SEAT: "SEAT_RUBBER",
    FRAME_COLOR: "MATTE_BLACK",
    BUILD_TYPE: "WELDED",
  },
  addons: [],
};

describe("B2B bulk pricing contract", () => {
  it("rejects prices sent by the client", () => {
    const result = BulkPriceRequestSchema.safeParse({
      rows: [{ ...validChairRow, unit_price: 1, total_price: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid product combinations", () => {
    expect(() =>
      nonTableInputFromBulkRow(
        {
          ...validChairRow,
          selections: {
            ...validChairRow.selections,
            SEAT_COLOR: "REXINE_TAN",
          },
        },
        "CHAIR"
      )
    ).toThrow();

    expect(() =>
      tableInputFromBulkRow({
        sku: "IMS-CF-42",
        quantity: 1,
        selections: {
          TOP_TAB: "WOOD",
          GAUGE: "G16",
          FRAME_COLOR: "MATTE_BLACK",
          BUILD_TYPE: "WELDED",
          SIZE: "4x2",
        },
        addons: [],
      })
    ).toThrow();

    expect(() =>
      nonTableInputFromBulkRow(
        {
          sku: "IMS-ST-12",
          quantity: 1,
          selections: {
            STAND_MATERIAL: "ST_MS",
            PACK: "PACK_1",
            BASE: "BASE_BUSH",
            WOOD: "WOOD_RUBBER_18",
          },
          addons: [],
        },
        "STAND"
      )
    ).toThrow();
  });

  it("keeps bulk row totals exactly equal to the per-row engine results", async () => {
    const priceRow = vi.fn(async (row: BulkRowInput) =>
      row.sku === "A"
        ? { unit_price: 1200, total_price: 2400, discount_pct: 0 }
        : { unit_price: 900, total_price: 1710, discount_pct: 5 }
    );

    const result = await priceBulkRows(
      [
        { ...validChairRow, sku: "A" },
        { ...validChairRow, sku: "B" },
      ],
      priceRow
    );

    expect(priceRow).toHaveBeenCalledTimes(2);
    expect(result.rows).toEqual([
      {
        unit_price: 1200,
        total_price: 2400,
        discount_pct: 0,
        requires_quote: false,
      },
      {
        unit_price: 900,
        total_price: 1710,
        discount_pct: 5,
        requires_quote: false,
      },
    ]);
    expect(result.grand_total).toBe(4110);
  });

  it("excludes custom-size rows from the grand total", async () => {
    const result = await priceBulkRows(
      [
        { ...validChairRow, sku: "A" },
        { ...validChairRow, sku: "B" },
      ],
      async (row) =>
        row.sku === "A"
          ? { unit_price: 4999, total_price: 4999 }
          : { requires_quote: true }
    );

    expect(result.rows[1]?.requires_quote).toBe(true);
    expect(result.rows[1]?.total_price).toBeNull();
    expect(result.grand_total).toBe(4999);
  });
});

describe("room size calculator", () => {
  const cases: Array<{
    input: {
      roomLengthFt: number;
      roomWidthFt: number;
      tableSize: RoomTableSize;
      seatsPerTable: number;
      clearanceFt: number;
      aislePct: number;
    };
    tables: number;
    seats: number;
  }> = [
    {
      input: {
        roomLengthFt: 40,
        roomWidthFt: 30,
        tableSize: "4x2",
        seatsPerTable: 4,
        clearanceFt: 2,
        aislePct: 25,
      },
      tables: 18,
      seats: 72,
    },
    {
      input: {
        roomLengthFt: 20,
        roomWidthFt: 15,
        tableSize: "2x2",
        seatsPerTable: 2,
        clearanceFt: 2,
        aislePct: 25,
      },
      tables: 6,
      seats: 12,
    },
    {
      input: {
        roomLengthFt: 10,
        roomWidthFt: 10,
        tableSize: "6x3",
        seatsPerTable: 8,
        clearanceFt: 1.5,
        aislePct: 40,
      },
      tables: 1,
      seats: 8,
    },
  ];

  it("calculates three fixed layout cases", () => {
    for (const testCase of cases) {
      const result = calculateRoomLayout(testCase.input);
      expect(result.tableCount).toBe(testCase.tables);
      expect(result.totalSeats).toBe(testCase.seats);
    }
  });
});

describe("CAD download lead gating", () => {
  it("does not sign a URL when the lead save fails", async () => {
    const createSignedUrl = vi.fn(async () => "https://example.test/model");
    const result = await requestCadDownload({
      saveLead: async () => {
        throw new Error("lead failed");
      },
      createSignedUrl,
    });

    expect(result.ok).toBe(false);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL after the lead is saved", async () => {
    const createSignedUrl = vi.fn(async () => "https://example.test/model");
    const result = await requestCadDownload({
      saveLead: async () => undefined,
      createSignedUrl,
    });

    expect(result).toEqual({
      ok: true,
      url: "https://example.test/model",
    });
    expect(createSignedUrl).toHaveBeenCalledOnce();
  });
});
