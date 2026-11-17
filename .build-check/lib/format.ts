const indianNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return indianNumber.format(Math.round(value));
}

export function formatDimension(value: number): string {
  return Number(value.toFixed(1)).toString();
}
