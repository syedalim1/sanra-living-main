import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import ProjectGallery from "@/components/public/ProjectGallery";
import { listPublishedProjects } from "@/lib/media/projects";

export const metadata: Metadata = {
  title: "Our Projects & Bulk Supply | SANRA LIVING",
  description: "See steel furniture supplied by SANRA LIVING for hospitality, commercial and institutional projects.",
  alternates: { canonical: "/projects" },
};

export const instant = false;

export default async function ProjectsPage() {
  await connection();
  const projects = await listPublishedProjects();

  return (
    <div className="sanra-container sanra-projects">
      <header className="sanra-projects-intro">
        <p className="sanra-label">Commercial &amp; institutional furniture</p>
        <h1 className="sanra-display">Our projects.</h1>
        <p>See completed furniture supply orders, with details on what we made and where it went.</p>
      </header>
      {projects.length ? (
        <div className="sanra-project-list">
          {projects.map((project) => (
            <article className="sanra-project sanra-rise" key={project.id}>
              <ProjectGallery images={project.photo_urls} title={project.title} />
              <div className="sanra-project-copy">
                <p className="sanra-label">{project.product_type}</p>
                <h2>{project.title}</h2>
                <dl>
                  <div><dt>Quantity</dt><dd>{project.quantity.toLocaleString("en-IN")} {project.quantity === 1 ? "piece" : "pieces"}</dd></div>
                  <div><dt>Location</dt><dd>{project.location}</dd></div>
                  {project.delivery_date && (
                    <div><dt>Delivered</dt><dd><time dateTime={project.delivery_date}>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(project.delivery_date))}</time></dd></div>
                  )}
                </dl>
                {project.delivery_details && <p>{project.delivery_details}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="sanra-catalog-empty">
          <p>Project photographs will appear here when they’re ready to share.</p>
          <Link href="/b2b" className="sanra-text-link">Explore bulk supply and trade tools</Link>
        </div>
      )}
      <div className="sanra-projects-cta">
        <Link className="sanra-button sanra-button--rust" href="/b2b#bulk">Get a bulk quote</Link>
      </div>
    </div>
  );
}
