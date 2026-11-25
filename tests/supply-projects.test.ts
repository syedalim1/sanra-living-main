import { createClient } from "@supabase/supabase-js";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIA_DERIVATIVES_BUCKET, MEDIA_ORIGINALS_BUCKET, mediaKeyFromUrl } from "@/lib/media/paths";
import { WATERMARK_MARKER } from "@/lib/media/watermark";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), client: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/admin/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.client,
  supabaseServer: { from: (table: string) => mocks.client().from(table) },
}));

type ProjectRow = {
  id: string;
  title: string;
  published: boolean;
  revision: number;
  photo_urls: string[];
};

function createTestStore() {
  const projects = new Map<string, ProjectRow>();
  const files = new Map<string, Blob>();
  const audit: string[] = [];

  // The real Supabase client runs against isolated in-memory responses.
  const client = createClient("https://projects.test", "test-service-role", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        const method = init?.method ?? "GET";
        const body = new Response(init?.body);
        if (url.pathname === "/rest/v1/admin_audit_log" && method === "POST") {
          audit.push((await body.json()).action);
          return new Response(null, { status: 201 });
        }
        if (url.pathname === "/rest/v1/supply_projects") {
          const equals = (column: string, value: string | number | boolean) => {
            const match = url.searchParams.get(column);
            return !match || match === "eq." + value;
          };
          const containment = url.searchParams.get("photo_urls");
          const selected = [...projects.values()].filter((row) =>
            equals("id", row.id) && equals("revision", row.revision) && equals("published", row.published) &&
            (!containment || row.photo_urls.some((photo) => containment === "cs.{" + photo + "}"))
          );

          if (method === "POST") {
            const row = await body.json() as ProjectRow;
            projects.set(row.id, row);
            return Response.json([row], { status: 201 });
          }
          if (method === "PATCH") {
            const patch = await body.json() as Partial<ProjectRow>;
            const changed = selected.map((row) => ({ ...row, ...patch }));
            for (const row of changed) projects.set(row.id, row);
            return Response.json(changed);
          }
          if (method === "DELETE") {
            for (const row of selected) projects.delete(row.id);
          }
          return Response.json(selected);
        }

        const prefix = "/storage/v1/object/";
        if (!url.pathname.startsWith(prefix)) throw new Error("Unexpected API request: " + url.pathname);
        const key = url.pathname.slice(prefix.length);
        if (method === "POST") {
          const type = new Headers(init?.headers).get("content-type") ?? "";
          files.set(key, new Blob([await body.arrayBuffer()], { type }));
          return Response.json({ Key: key });
        }
        if (method === "DELETE") {
          const { prefixes } = await body.json() as { prefixes: string[] };
          for (const path of prefixes) files.delete(key + "/" + path);
          return Response.json([]);
        }
        const file = files.get(key);
        return file ? new Response(file) : Response.json({ message: "Object not found" }, { status: 404 });
      },
    },
  });

  mocks.client.mockReturnValue(client);
  return { projects, files, audit };
}

function projectForm(project?: ProjectRow, published = false) {
  const form = new FormData();
  const values = {
    title: project?.title ?? "Local workflow fixture",
    product_type: "Steel dining chairs",
    quantity: "125",
    location: "Test location",
    delivery_date: "2026-11-13",
    delivery_details: "Delivery description for the local workflow test.",
    ordered_photos: "on",
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  if (project) {
    form.set("id", project.id);
    form.set("revision", String(project.revision));
  }
  if (published) {
    form.set("published", "on");
    form.set("approved", "on");
  }
  return form;
}

async function makePhoto(color: string, name: string) {
  const bytes = await sharp({ create: { width: 900, height: 600, channels: 3, background: color } }).png().toBuffer();
  return { bytes, file: new File([Uint8Array.from(bytes)], name, { type: "image/png" }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ email: "staff@example.test" });
});

describe("completed project workflow", () => {
  it("uploads private originals, publishes the ordered gallery, and removes public access on unpublish and delete", async () => {
    const store = createTestStore();
    const { saveProjectAction, deleteProjectAction } = await import("../app/admin/(dashboard)/projects/actions");
    const { GET } = await import("../app/api/media/[...key]/route");
    const { listPublishedProjects } = await import("@/lib/media/projects");
    const { default: ProjectsPage } = await import("../app/(public)/projects/page");
    const firstPhoto = await makePhoto("#ba7b33", "delivery-first.png");
    const secondPhoto = await makePhoto("#428f7b", "delivery-second.png");
    const thirdPhoto = await makePhoto("#325c8c", "delivery-third.png");
    const current = () => [...store.projects.values()][0];
    const getPhoto = (path: string, mobile = false) => GET(
      new Request("https://sanraliving.test" + path + (mobile ? "?size=mobile" : "")),
      { params: Promise.resolve({ key: mediaKeyFromUrl(path)!.split("/") }) }
    );

    const draft = projectForm();
    draft.append("photos", firstPhoto.file);
    draft.append("photos", secondPhoto.file);
    draft.append("photo_order", "upload:1");
    draft.append("photo_order", "upload:0");
    expect((await saveProjectAction({}, draft)).error).toBeUndefined();
    const [secondUrl, firstUrl] = current().photo_urls;
    const firstKey = mediaKeyFromUrl(firstUrl)!;
    const secondKey = mediaKeyFromUrl(secondUrl)!;
    expect(Buffer.from(await store.files.get(MEDIA_ORIGINALS_BUCKET + "/" + firstKey)!.arrayBuffer())).toEqual(firstPhoto.bytes);
    expect((await getPhoto(secondUrl)).status).toBe(404);
    expect(await listPublishedProjects()).toEqual([]);

    const publish = projectForm(current(), true);
    publish.append("photos", thirdPhoto.file);
    for (const entry of [firstUrl, "upload:0", secondUrl]) publish.append("photo_order", entry);
    expect((await saveProjectAction({}, publish)).error).toBeUndefined();
    const thirdUrl = current().photo_urls[1];
    expect((await listPublishedProjects())[0].photo_urls).toEqual([firstUrl, thirdUrl, secondUrl]);
    const html = renderToStaticMarkup(await ProjectsPage());
    expect(html).toContain("Local workflow fixture");
    expect(html).toContain("125 pieces");
    expect(html).toContain("2026-11-13");
    expect(html).toContain("Delivery description for the local workflow test.");
    expect(html).toContain(firstUrl + "?size=mobile");

    const image = await getPhoto(firstUrl);
    const mobile = await getPhoto(firstUrl, true);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/webp");
    const fullMeta = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    const mobileMeta = await sharp(Buffer.from(await mobile.arrayBuffer())).metadata();
    expect(fullMeta.xmp?.includes(WATERMARK_MARKER)).toBe(true);
    expect(mobileMeta.width).toBe(640);

    const edit = projectForm(current(), true);
    edit.set("title", "Updated workflow fixture");
    edit.append("photo_order", thirdUrl);
    edit.append("photo_order", firstUrl);
    expect((await saveProjectAction({}, edit)).error).toBeUndefined();
    expect((await listPublishedProjects())[0]).toMatchObject({
      title: "Updated workflow fixture",
      photo_urls: [thirdUrl, firstUrl],
    });
    expect((await getPhoto(secondUrl)).status).toBe(404);
    expect([...store.files.keys()].some((key) => key.endsWith(secondKey))).toBe(false);

    const stale = projectForm({ ...current(), revision: 1 });
    stale.set("confirm_delete", "on");
    expect((await deleteProjectAction({}, stale)).error).toBeDefined();
    expect(store.projects.size).toBe(1);

    const unpublish = projectForm(current());
    unpublish.append("photo_order", thirdUrl);
    unpublish.append("photo_order", firstUrl);
    expect((await saveProjectAction({}, unpublish)).error).toBeUndefined();
    expect(await listPublishedProjects()).toEqual([]);
    expect((await getPhoto(firstUrl)).status).toBe(404);
    expect(store.files.has(MEDIA_DERIVATIVES_BUCKET + "/" + firstKey)).toBe(true);

    const remove = projectForm(current());
    expect((await deleteProjectAction({}, remove)).error).toMatch(/Confirm/);
    remove.set("confirm_delete", "on");
    expect((await deleteProjectAction({}, remove)).error).toBeUndefined();
    expect(store.projects.size).toBe(0);
    expect(store.files.size).toBe(0);
    expect(store.audit).toEqual(["CREATE", "UPDATE", "UPDATE", "UPDATE", "DELETE"]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects");
  });

  it("checks admin access before any project write", async () => {
    const { saveProjectAction, deleteProjectAction } = await import("../app/admin/(dashboard)/projects/actions");
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));
    await expect(saveProjectAction({}, new FormData())).rejects.toThrow("Unauthorized");
    await expect(deleteProjectAction({}, new FormData())).rejects.toThrow("Unauthorized");
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
