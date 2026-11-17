export function stripCostFragments(label: string): string {
  return label
    .replace(/₹\s*[\d,]+(?:\.\d+)?/g, "")
    .replace(/^\s*\+\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
