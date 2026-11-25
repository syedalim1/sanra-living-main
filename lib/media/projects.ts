import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { mediaKeyFromUrl, projectIdFromMediaKey } from "./paths";

export interface SupplyProject {
  id: string;
  title: string;
  product_type: string;
  quantity: number;
  location: string;
  delivery_date: string | null;
  delivery_details: string | null;
  photo_urls: string[];
}

export const PROJECT_FIELDS = "id, title, product_type, quantity, location, delivery_date, delivery_details, photo_urls";

export async function listPublishedProjects(): Promise<SupplyProject[]> {
  try {
    const { data } = await supabaseServer.from("supply_projects").select(PROJECT_FIELDS)
      .eq("published", true).order("delivery_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(24);
    return ((data ?? []) as SupplyProject[]).flatMap((project) => {
      const photo_urls = project.photo_urls.filter((url) => projectIdFromMediaKey(mediaKeyFromUrl(url) ?? "") === project.id);
      return photo_urls.length ? [{ ...project, photo_urls }] : [];
    });
  } catch {
    return [];
  }
}
