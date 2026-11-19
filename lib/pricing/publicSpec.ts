import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export interface PublicProductSpec {
  pipe_spec: string | null;
}

export async function getPublicProductSpec(
  productId: string
): Promise<PublicProductSpec> {
  try {
    const { data } = await supabaseServer
      .from("product_pricing_rules")
      .select("pipe_spec")
      .eq("product_id", productId)
      .maybeSingle();

    return { pipe_spec: data?.pipe_spec ?? null };
  } catch {
    return { pipe_spec: null };
  }
}
