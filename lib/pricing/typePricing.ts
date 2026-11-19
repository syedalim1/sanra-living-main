export interface TypePriceInput {
  baseWeight: number;
  metalRate: number;
  metalMultiplier?: number;
  isSS?: boolean;
  ssWeightFactor?: number;
  seatArea?: number;
  seatRate?: number;
  frameFinishingCost?: number;
  consumables: number;
  labor: number;
  overheadPct: number;
  retailMarginPct: number;
  flatAddons?: number;
  quantity: number;
  isKnockdown?: boolean;
  knockdownPct?: number;
  qtyDiscount4to9Pct: number;
  qtyDiscount10PlusPct: number;
}

export interface TypePriceOutput {
  unit_price: number;
  total_price: number;
  discount_pct: number;
  bumper_included: false;
}

export function roundUpToClean99(value: number): number {
  if (value <= 99) return 99;
  return Math.ceil((value - 99) / 100) * 100 + 99;
}

export function getQuantityDiscount(
  quantity: number,
  qtyDiscount4to9Pct: number,
  qtyDiscount10PlusPct: number
): number {
  if (quantity >= 10) return qtyDiscount10PlusPct;
  if (quantity >= 4) return qtyDiscount4to9Pct;
  return 0;
}

export function calculateTypePrice(input: TypePriceInput): TypePriceOutput {
  const {
    baseWeight,
    metalRate,
    metalMultiplier = 1,
    isSS = false,
    ssWeightFactor = 1,
    seatArea = 0,
    seatRate = 0,
    frameFinishingCost = 0,
    consumables,
    labor,
    overheadPct,
    retailMarginPct,
    flatAddons = 0,
    quantity,
    isKnockdown = false,
    knockdownPct = 0,
    qtyDiscount4to9Pct,
    qtyDiscount10PlusPct,
  } = input;

  const metalCost =
    baseWeight * metalRate * metalMultiplier * (isSS ? ssWeightFactor : 1) +
    frameFinishingCost;
  const seatCost = seatArea * seatRate;
  const subtotal = metalCost + seatCost + consumables + labor;
  const withOverhead = subtotal * (1 + overheadPct / 100);
  let withMargin = withOverhead * (1 + retailMarginPct / 100);

  if (isKnockdown && knockdownPct !== 0) {
    withMargin = withMargin * (1 + knockdownPct / 100);
  }

  const baseUnitPrice = roundUpToClean99(withMargin + flatAddons);
  const discountPct = getQuantityDiscount(
    quantity,
    qtyDiscount4to9Pct,
    qtyDiscount10PlusPct
  );
  const unitPrice = roundUpToClean99(baseUnitPrice * (1 - discountPct / 100));
  const totalPrice = Math.round(unitPrice * quantity);

  return {
    unit_price: unitPrice,
    total_price: totalPrice,
    discount_pct: discountPct,
    bumper_included: false,
  };
}

export function calculatePackPrice(
  input: TypePriceInput,
  packCode: string,
  pack2Saving: number
): TypePriceOutput {
  const single = calculateTypePrice(input);

  if (packCode !== "PACK_2") {
    return single;
  }

  const discountPct = getQuantityDiscount(
    input.quantity,
    input.qtyDiscount4to9Pct,
    input.qtyDiscount10PlusPct
  );
  const packUnitPrice = (single.unit_price * 2 - pack2Saving) * (1 - discountPct / 100);
  const totalPrice = Math.round(packUnitPrice * input.quantity);

  return {
    unit_price: packUnitPrice,
    total_price: totalPrice,
    discount_pct: discountPct,
    bumper_included: false,
  };
}
