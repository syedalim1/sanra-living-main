import { describe, expect, it } from "vitest";
import {
  buildPublicTrackingResponse,
  isWarrantyEligible,
  verifyTracking,
} from "../lib/tracking/service";
import {
  maskName,
  maskPhone,
  normalizePhoneLast4,
  normalizeTrackingCode,
} from "../lib/tracking/mask";
import type {
  PhotoRecord,
  StageEvent,
  TrackingOrder,
  TrackingStore,
} from "../lib/tracking/types";

const order: TrackingOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  tracking_code: "SANRA-AAAA",
  customer_name_masked: "R***sh",
  phone_last_4: "5303",
  current_stage: "WELDED",
  configured_items_json: [
    { name: "Cafe Table", size: "4x2 ft", quantity: 2, price: 9999 },
  ],
  warranty_years: 10,
  warranty_expiry_date: null,
  created_at: "2026-11-17T10:00:00.000Z",
  archived: false,
};

const events: StageEvent[] = [
  { stage: "PIPE_CUT", at: "2026-11-17T10:00:00.000Z" },
  { stage: "WELDED", at: "2026-11-18T10:00:00.000Z" },
];

function makeStore(
  seedOrder: TrackingOrder | null = order
): TrackingStore & { attempts: Array<{ trackingCode: string; ok: boolean; at: string }> } {
  const attempts: Array<{ trackingCode: string; ok: boolean; at: string }> = [];

  return {
    attempts,
    async findOrderByCode(code) {
      return seedOrder && seedOrder.tracking_code === code ? seedOrder : null;
    },
    async countRecentFailures(code, sinceIso) {
      return attempts.filter(
        (attempt) =>
          attempt.trackingCode === code &&
          !attempt.ok &&
          attempt.at >= sinceIso
      ).length;
    },
    async logAttempt(input) {
      attempts.push({
        trackingCode: input.trackingCode,
        ok: input.ok,
        at: input.at,
      });
    },
    async getStageEvents() {
      return events;
    },
    async getVisiblePhotos(): Promise<PhotoRecord[]> {
      return [];
    },
  };
}

const now = new Date("2026-11-19T10:00:00.000Z");

describe("tracking privacy helpers", () => {
  it("masks names and phones, including short names", () => {
    expect(maskName("Rakesh")).toBe("R***sh");
    expect(maskName("John")).toBe("J***hn");
    expect(maskName("Ram")).toBe("R***");
    expect(maskName("A")).toBe("A***");
    expect(maskName("")).toBe("***");
    expect(maskPhone("5303")).toBe("+91 ******5303");
    expect(maskPhone("03")).toBe("+91 ******");
  });

  it("normalizes codes with or without the SANRA prefix", () => {
    expect(normalizeTrackingCode("7k9p")).toBe("SANRA-7K9P");
    expect(normalizeTrackingCode("SANRA-7K9P")).toBe("SANRA-7K9P");
    expect(normalizeTrackingCode("sanra7k9p")).toBe("SANRA-7K9P");
    expect(normalizeTrackingCode("SANRA-0O1I")).toBeNull();
    expect(normalizePhoneLast4("98765 5303")).toBe("5303");
  });
});

describe("tracking verification", () => {
  it("returns the same generic result for a wrong code, wrong phone and unknown code", async () => {
    const store = makeStore();

    const wrongCode = await verifyTracking({
      code: "SANRA-BBBB",
      last4: "5303",
      ipHash: "hash",
      store,
      now,
    });
    const wrongPhone = await verifyTracking({
      code: "SANRA-AAAA",
      last4: "1111",
      ipHash: "hash",
      store,
      now,
    });
    const unknownCode = await verifyTracking({
      code: "SANRA-CCCC",
      last4: "5303",
      ipHash: "hash",
      store,
      now,
    });

    expect(wrongCode.kind).toBe("generic_failure");
    expect(wrongPhone.kind).toBe("generic_failure");
    expect(unknownCode.kind).toBe("generic_failure");
  });

  it("locks a code after five failed attempts", async () => {
    const store = makeStore();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await verifyTracking({
        code: "SANRA-AAAA",
        last4: "1111",
        ipHash: "hash",
        store,
        now,
      });
      expect(result.kind).toBe("generic_failure");
    }

    const locked = await verifyTracking({
      code: "SANRA-AAAA",
      last4: "1111",
      ipHash: "hash",
      store,
      now,
    });

    expect(locked.kind).toBe("locked");
    expect(store.attempts.filter((attempt) => !attempt.ok)).toHaveLength(6);
  });

  it("succeeds only when the code and last four both match", async () => {
    const store = makeStore();

    const result = await verifyTracking({
      code: "SANRA-AAAA",
      last4: "5303",
      ipHash: "hash",
      store,
      now,
    });

    expect(result.kind).toBe("success");
    expect(store.attempts[0]?.ok).toBe(true);
  });
});

describe("public tracking payload", () => {
  it("contains only allowed fields and never leaks money, full identity or notes", () => {
    const sensitiveOrder = {
      ...order,
      total_amount: 99999,
      advance_paid: 12345,
      balance_due: 87654,
      customer_phone_full: "9876545303",
      customer_name_full: "Rakesh Kumar",
      notes_internal: "internal secret",
    } as TrackingOrder;

    const response = buildPublicTrackingResponse({
      order: sensitiveOrder,
      events,
      signedPhotos: [
        { url: "https://example.test/signed-photo", caption: "Welded frame" },
      ],
    });

    expect(Object.keys(response).sort()).toEqual(
      [
        "current_stage",
        "customer_name_masked",
        "customer_phone_masked",
        "photos",
        "product_lines",
        "stage_timeline",
        "warranty_available",
        "warranty_expiry_date",
      ].sort()
    );

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("Rakesh Kumar");
    expect(serialized).not.toContain("9876545303");
    expect(serialized).not.toContain("99999");
    expect(serialized).not.toContain("internal secret");
    expect(response.product_lines[0]).toEqual({
      name: "Cafe Table",
      size: "4x2 ft",
      quantity: 2,
    });
  });

  it("marks warranty unavailable before READY", () => {
    expect(isWarrantyEligible(order)).toBe(false);
    expect(
      isWarrantyEligible({
        current_stage: "READY",
        warranty_expiry_date: "2027-11-17",
      })
    ).toBe(true);
    expect(
      isWarrantyEligible({
        current_stage: "READY",
        warranty_expiry_date: null,
      })
    ).toBe(false);
  });
});
