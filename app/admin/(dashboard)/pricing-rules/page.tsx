import "server-only";

import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import PricingRulesClient from "./PricingRulesClient";
import type {
  PrivateBulkRule,
  PrivatePricingProfile,
  PrivatePricingTier,
} from "@/lib/variants/types";

export const instant = false;

export default async function AdminPricingRulesPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [profilesRes, bulkRes, tiersRes] = await Promise.all([
    db.from("pricing_profiles").select("*").order("code"),
    db.from("bulk_rules").select("*").order("product_type"),
    db.from("pricing_tiers").select("*").order("priority"),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">
          Pricing Rules & MOQ Settings
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure SS/MS pricing profiles, markup or gross margin, minimum margin protection, rounding, GST, and bulk MOQ rules.
        </p>
      </div>

      <PricingRulesClient
        profiles={(profilesRes.data as PrivatePricingProfile[]) ?? []}
        bulkRules={(bulkRes.data as PrivateBulkRule[]) ?? []}
        tiers={(tiersRes.data as PrivatePricingTier[]) ?? []}
      />
    </div>
  );
}
