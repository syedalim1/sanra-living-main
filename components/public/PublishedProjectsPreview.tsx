import "server-only";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/media/paths";
import WatermarkedImage from "@/components/WatermarkedImage";

export default async function PublishedProjectsPreview() {
  let projects: Array<{
    id: string;
    title: string;
    product_type: string;
    quantity: number | null;
    location: string | null;
    photo_urls: string[];
  }> = [];

  try {
    const { data } = await supabaseServer
      .from("supply_projects")
      .select("id, title, product_type, quantity, location, photo_urls")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(3);

    projects = (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      product_type: row.product_type as string,
      quantity: row.quantity != null ? Number(row.quantity) : null,
      location: (row.location as string | null) ?? null,
      photo_urls: Array.isArray(row.photo_urls)
        ? (row.photo_urls as string[]).flatMap((u) => publicImageUrl(u) ?? [])
        : [],
    }));
  } catch {
    projects = [];
  }

  if (projects.length === 0) return null;

  return (
    <section
      className="sanra-container py-12 border-t border-neutral-200"
      aria-labelledby="projects-preview-heading"
    >
      <header className="sanra-section-intro mb-6">
        <div>
          <p className="sanra-label">Completed Installations</p>
          <h2 id="projects-preview-heading" className="sanra-display">
            Published factory projects.
          </h2>
        </div>
        <Link className="sanra-text-link" href="/projects">
          View all projects <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {projects.map((proj) => (
          <article
            key={proj.id}
            className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
          >
            {proj.photo_urls[0] && (
              <div className="aspect-video bg-neutral-100">
                <WatermarkedImage
                  src={proj.photo_urls[0]}
                  alt={`${proj.title} — ${proj.location ?? "Coimbatore"}`}
                  aspectRatio="video"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            )}
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {proj.product_type}
                {proj.location ? ` · ${proj.location}` : ""}
              </p>
              <h3 className="text-sm font-bold text-[#111111]">{proj.title}</h3>
              {proj.quantity != null && proj.quantity > 0 && (
                <p className="text-xs text-neutral-600">
                  Quantity supplied: {proj.quantity}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
