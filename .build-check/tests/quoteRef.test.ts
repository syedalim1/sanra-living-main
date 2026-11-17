import { describe, expect, it } from "vitest";
import { generateQuoteRef, isValidQuoteRef } from "../lib/quoteRef";

describe("quote references", () => {
  it("matches the Q-XXXXXX format", () => {
    for (let index = 0; index < 100; index += 1) {
      const reference = generateQuoteRef();
      expect(reference).toMatch(/^Q-[2-9A-HJ-NP-Z]{6}$/);
      expect(isValidQuoteRef(reference)).toBe(true);
    }
  });

  it("never uses ambiguous characters 0, O, 1 or I", () => {
    for (let index = 0; index < 100; index += 1) {
      const body = generateQuoteRef().slice(2);
      expect(body).not.toMatch(/[0O1I]/);
    }
  });

  it("is unique across 1,000 generations", () => {
    const references = new Set<string>();
    for (let index = 0; index < 1000; index += 1) {
      references.add(generateQuoteRef());
    }
    expect(references.size).toBe(1000);
  });
});
