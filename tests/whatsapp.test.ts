import { describe, expect, it } from "vitest";
import { buildBookingMessage, type BookingMessageInput } from "../lib/whatsapp";

const baseInput = {
  reference: "Q-7K9P2X",
  productName: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
  sku: "IMS-CF-42",
  sizeLabel: "4 x 2 ft",
  topLabel: "Wood Tops — Natural Honey Teak Polish",
  gaugeLabel: "16 Gauge Heavy Commercial (1.6mm Tata Structura)",
  frameColorLabel: "Matte Black Powder Coated",
  buildLabel: "100% Factory Welded (Coimbatore Local Delivery)",
  addons: ["Laptop Wire Grommet Hole"],
  quantity: 2,
  configUrl:
    "https://sanraliving.example/products/IMS-CF-42?top_tab=WOOD&gauge=G16&size=4x2",
};

function buildNormal(overrides: Partial<BookingMessageInput> = {}): string {
  return buildBookingMessage({
    ...baseInput,
    isCustom: false,
    unitPrice: 7199,
    totalPrice: 14398,
    ...overrides,
  } as BookingMessageInput);
}

describe("WhatsApp booking message", () => {
  it("builds a complete normal configuration message", () => {
    const message = buildNormal();

    expect(message).toContain("Hi SANRA LIVING, I'd like to book this configuration:");
    expect(message).toContain("Product: Commercial Heavy-Gauge Cafe Table (4x2 ft) (IMS-CF-42)");
    expect(message).toContain("Size: 4 x 2 ft");
    expect(message).toContain("Top: Wood Tops — Natural Honey Teak Polish");
    expect(message).toContain(
      "Build Grade: 16 Gauge Heavy Commercial (1.6mm Tata Structura) | Frame: Matte Black Powder Coated"
    );
    expect(message).toContain("Build: 100% Factory Welded (Coimbatore Local Delivery)");
    expect(message).toContain("Add-ons: Laptop Wire Grommet Hole");
    expect(message).toContain("Quantity: 2");
    expect(message).toContain("Quoted Price: ₹14,398 (₹7,199 each)");
    expect(message).toContain("Quote Ref: Q-7K9P2X");
    expect(message).toContain(`Config link: ${baseInput.configUrl}`);
    expect(message).toContain("Please confirm size and delivery details.");
  });

  it("builds a granite configuration and formats Indian digit grouping", () => {
    const message = buildNormal({
      topLabel: "Granite & Marble Tops — Absolute Jet Black",
      addons: ["Under-Table CPU / Bag Holder"],
      quantity: 10,
      unitPrice: 12999,
      totalPrice: 114391,
    } as Partial<BookingMessageInput>);

    expect(message).toContain("Top: Granite & Marble Tops — Absolute Jet Black");
    expect(message).toContain("Add-ons: Under-Table CPU / Bag Holder");
    expect(message).toContain("Quoted Price: ₹1,14,391 (₹12,999 each)");
    expect(message).toContain("Quantity: 10");
  });

  it("strips embedded add-on prices from labels", () => {
    const message = buildNormal({
      addons: ["+ ₹50 Laptop Wire Grommet Hole", "+ ₹150 Under-Table CPU / Bag Holder"],
    } as Partial<BookingMessageInput>);

    expect(message).toContain("Add-ons: Laptop Wire Grommet Hole, Under-Table CPU / Bag Holder");
    expect(message).not.toContain("₹50");
    expect(message).not.toContain("₹150");
    expect(message.match(/₹/g)).toHaveLength(2);
  });

  it("builds a custom-size request without any quoted price", () => {
    const message = buildBookingMessage({
      ...baseInput,
      sizeLabel: "Custom Size Request",
      addons: [],
      isCustom: true,
      customLengthFt: 5.5,
      customWidthFt: 2.5,
    });

    expect(message).toContain("Size: Custom Size Request");
    expect(message).toContain("Add-ons: None");
    expect(message).toContain("Quote Ref: Q-7K9P2X");
    expect(message).toContain("Please share a custom quote for this exact size.");
    expect(message).toContain("Required size: 5.5 x 2.5 ft");
    expect(message).not.toContain("Quoted Price");
    expect(message).not.toContain("₹");
  });

  it("builds a chair message with type-specific selections", () => {
    const message = buildBookingMessage({
      ...baseInput,
      productType: "CHAIR",
      selectionLines: [
        { label: "Metal type", value: "Jindal SS 304 (100% Rust-Proof + Argon TIG)" },
        { label: "Seat", value: "Solid Kerala Rubberwood Seat (100% Seasoned Grade-A)" },
        { label: "Frame", value: "Natural SS finish" },
        { label: "Build", value: "100% Factory Welded (Coimbatore Local Delivery)" },
        { label: "Warranty", value: "3-Year Free Replacement + 15 Years Rust-Free Warranty" },
      ],
      isCustom: false,
      unitPrice: 8999,
      totalPrice: 8999,
    });

    expect(message).toContain("Metal type: Jindal SS 304");
    expect(message).toContain("Seat: Solid Kerala Rubberwood Seat");
    expect(message).toContain("Frame: Natural SS finish");
    expect(message).toContain("Build: 100% Factory Welded");
    expect(message).toContain("Quoted Price: ₹8,999 (₹8,999 each)");
    expect(message).not.toContain("Size:");
    expect(message).not.toContain("Top:");
    expect(message).not.toContain("Pipe/Frame:");
  });

  it("builds a stand message including the pack saving label", () => {
    const message = buildBookingMessage({
      ...baseInput,
      productType: "STAND",
      selectionLines: [
        { label: "Material", value: "Jindal SS 304" },
        { label: "Pack size", value: "Pack of 2 Nesting Combo (Save ₹150!)" },
        { label: "Base", value: "Lockable Castor Wheels" },
      ],
      isCustom: false,
      unitPrice: 6399,
      totalPrice: 6399,
    });

    expect(message).toContain("Material: Jindal SS 304");
    expect(message).toContain("Pack size: Pack of 2 Nesting Combo (Save ₹150!)");
    expect(message).toContain("Base: Lockable Castor Wheels");
    expect(message).toContain("Quoted Price: ₹6,399 (₹6,399 each)");
    expect(message).not.toContain("Size:");
    expect(message).not.toContain("Top:");
  });

  it("builds an SS unit message with grade, thickness and finish", () => {
    const message = buildBookingMessage({
      ...baseInput,
      productType: "SS_UNIT",
      selectionLines: [
        { label: "Grade", value: "Jindal SS 304 (Medical / Food Grade)" },
        { label: "Top thickness", value: "16G Top (Heavier)" },
        { label: "Finish", value: "Mirror Buffed" },
      ],
      isCustom: false,
      unitPrice: 12999,
      totalPrice: 12999,
    });

    expect(message).toContain("Grade: Jindal SS 304 (Medical / Food Grade)");
    expect(message).toContain("Top thickness: 16G Top (Heavier)");
    expect(message).toContain("Finish: Mirror Buffed");
    expect(message).toContain("Quoted Price: ₹12,999 (₹12,999 each)");
    expect(message).not.toContain("Pipe/Frame:");
  });

  it("never includes internal cost, weight, rate or margin wording", () => {
    const messages = [
      buildNormal(),
      buildNormal({ topLabel: "Granite & Marble Tops — Tan Brown" } as Partial<BookingMessageInput>),
      buildBookingMessage({
        ...baseInput,
        sizeLabel: "Custom Size Request",
        isCustom: true,
        customLengthFt: 4,
        customWidthFt: 2,
      }),
      buildBookingMessage({
        ...baseInput,
        productType: "CHAIR",
        selectionLines: [
          { label: "Metal type", value: "MS Powder Coated (Tata/Apollo CR)" },
          { label: "Seat", value: "40-Density Cushion Seat with Rexine" },
          { label: "Seat color", value: "Tan Brown" },
          { label: "Frame", value: "Matte Black Powder Coated" },
          { label: "Build", value: "5-Min Flat-Pack Knock-Down (Pan-India Courier)" },
        ],
        isCustom: false,
        unitPrice: 4999,
        totalPrice: 4999,
      }),
    ];

    for (const message of messages) {
      const lower = message.toLowerCase();
      expect(lower).not.toContain("cost");
      expect(lower).not.toContain("weight");
      expect(lower).not.toContain("margin");
      expect(lower).not.toContain("rate per");
    }
  });
});
