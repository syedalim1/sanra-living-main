export function stripCostFragments(label: string): string {
  return label
    .replace(/^\s*\+\s*₹\s*[\d,]+(?:\.\d+)?\s*/g, "")
    .replace(/^\s*₹\s*[\d,]+(?:\.\d+)?\s*[-–—]?\s*/g, "")
    .replace(/^\s*\+\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
