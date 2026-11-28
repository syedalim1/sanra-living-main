import type { FrameMaterialCode, PrivatePricingProfile, PublicSurfaceOption } from "@/lib/variants/types";

const MATERIAL_WORDS = {
  SS: /\bSS\b|\bSTAINLESS\b/,
  MS: /\bMS\b|\bMILD STEEL\b/,
};

const TYPE_WORDS: Record<string, RegExp> = {
  CHAIR_TABLE_SET: /\b(SETS?|COMBOS?)\b|\bCHAIR TABLE\b/,
  CHAIR: /\b(CHAIRS?|SEATING)\b/,
  TABLE: /\bTABLES?\b/,
  STAND: /\bSTANDS?\b/,
  RACK: /\bRACKS?\b/,
  SS_UNIT: /\bUNITS?\b/,
  BENCH_DESK: /\b(BENCH(ES)?|DESKS?)\b/,
  COT_BUNK: /\b(COTS?|BUNKS?)\b/,
  TROLLEY: /\bTROLLEYS?\b/,
  CUSTOM: /\bCUSTOM\b/,
};

type MatchableProfile = Pick<PrivatePricingProfile, "id" | "code" | "name" | "channel" | "default_margin_pct" | "is_active">;

export function suggestPricingProfile(
  profiles: MatchableProfile[],
  material: FrameMaterialCode,
  productType: string,
): string | null {
  const type = productType === "SET" ? "CHAIR_TABLE_SET" : productType;
  const otherMaterial = material === "SS" ? "MS" : "SS";
  const candidates = profiles.flatMap((profile) => {
    if (!profile.is_active || profile.channel !== "RETAIL" || profile.default_margin_pct == null) return [];

    const words = `${profile.code} ${profile.name}`.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
    if (!MATERIAL_WORDS[material].test(words) || MATERIAL_WORDS[otherMaterial].test(words)) return [];

    const types = Object.entries(TYPE_WORDS).filter(([, pattern]) => pattern.test(words)).map(([key]) => key);
    if (types.includes("CHAIR_TABLE_SET")) {
      // A set profile can also spell out "table" and "chair".
      return type === "CHAIR_TABLE_SET" ? [{ id: profile.id, score: 2 }] : [];
    }
    if (types.includes(type)) return [{ id: profile.id, score: 2 }];
    return types.length === 0 ? [{ id: profile.id, score: 1 }] : [];
  }).sort((a, b) => b.score - a.score);

  const [best, next] = candidates;
  return best && best.score !== next?.score ? best.id : null;
}

export function surfaceAppliesToModel(
  surface: Pick<PublicSurfaceOption, "applicable_product_types" | "material_family" | "kind">,
  productType: string,
  topCategories: string[],
) {
  const type = productType === "CHAIR_TABLE_SET" ? "TABLE" : productType;
  if (surface.applicable_product_types.length &&
      !surface.applicable_product_types.includes(productType) &&
      !surface.applicable_product_types.includes(type)) return false;
  if (!topCategories.length || surface.kind !== "TABLETOP") return true;
  return !surface.material_family || topCategories.includes(surface.material_family);
}
