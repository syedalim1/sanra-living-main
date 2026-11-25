import { connection } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PROJECT_FIELDS, type SupplyProject } from "@/lib/media/projects";
import ProjectEditor from "./ProjectEditor";

export const instant = false;

export default async function AdminProjectsPage() {
  await connection();
  const { data, error } = await createServerClient().from("supply_projects")
    .select(PROJECT_FIELDS + ", published, revision").order("created_at", { ascending: false });
  const projects = (data ?? []) as unknown as Array<SupplyProject & { published: boolean; revision: number }>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bulk supply projects</h1>
        <p className="mt-1 text-sm text-neutral-600">Publish completed deliveries with approved photographs.</p>
      </header>
      {error ? (
        <p role="alert" className="text-sm text-red-800">Project storage is unavailable. Verify the media migration is installed.</p>
      ) : (
        <>
          <details className="border border-neutral-200 bg-white p-5">
            <summary className="cursor-pointer font-bold">Add a project</summary>
            <ProjectEditor />
          </details>
          {projects.map((project) => (
            <details className="border border-neutral-200 bg-white p-5" key={project.id}>
              <summary className="cursor-pointer font-bold">{project.title} · {project.published ? "Published" : "Draft"}</summary>
              <ProjectEditor key={project.revision} project={project} />
            </details>
          ))}
        </>
      )}
    </div>
  );
}
