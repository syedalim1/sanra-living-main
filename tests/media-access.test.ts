import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaUrl, publicImageUrl, MEDIA_DERIVATIVES_BUCKET, MEDIA_ORIGINALS_BUCKET } from "@/lib/media/paths";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), requireAdminApi: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createClient }));
vi.mock("@/lib/admin/auth", () => ({ requireAdminApi: mocks.requireAdminApi }));

const catalog = "catalog/products/IMS-42/main-12345678-1234-1234-1234-123456789123.webp";
const projectId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const project = "project/" + projectId + "/photo-12345678-1234-1234-1234-123456789123.webp";
const params = (key: string) => ({ params: Promise.resolve({ key: key.split("/") }) });
const request = (key: string, search = "") => new Request("https://sanraliving.com" + mediaUrl(key) + search);
const photo = new Blob(["test"], { type: "image/webp" });

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("photo access boundaries", () => {
  it("rewrites legacy URLs without exposing their origin and rejects arbitrary image URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    expect(publicImageUrl("https://test.supabase.co/storage/v1/object/public/product-images/products/IMS/photo.webp"))
      .toBe("/api/media/catalog/legacy/products/IMS/photo.webp");
    expect(publicImageUrl("https://other.example/photo.jpg")).toBeNull();
    expect(publicImageUrl("https://test.supabase.co/storage/v1/object/sign/sanra-image-originals/secret.webp")).toBeNull();
  });

  it("rejects access to original keys and uses only the derivative bucket in public delivery", async () => {
    const { GET } = await import("../app/api/media/[...key]/route");
    const invalid = "order/orders/X/wip-12345678-1234-1234-1234-123456789123.webp";
    expect((await GET(request(invalid), params(invalid))).status).toBe(404);
    expect(mocks.createClient).not.toHaveBeenCalled();

    const download = vi.fn().mockResolvedValue({ data: photo });
    const from = vi.fn().mockReturnValue({ download });
    mocks.createClient.mockReturnValue({ storage: { from } });

    const response = await GET(request(catalog, "?size=mobile&view=original"), params(catalog));
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledExactlyOnceWith(MEDIA_DERIVATIVES_BUCKET);
    expect(download).toHaveBeenCalledExactlyOnceWith("mobile/" + catalog);
  });

  it("requires both publication and photo membership before serving a project image", async () => {
    const { GET } = await import("../app/api/media/[...key]/route");
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: projectId }, error: null }),
    };
    const download = vi.fn().mockResolvedValue({ data: photo });
    mocks.createClient.mockReturnValue({ from: vi.fn().mockReturnValue(query), storage: { from: () => ({ download }) } });

    expect((await GET(request(project), params(project))).status).toBe(404);
    expect(download).not.toHaveBeenCalled();
    const response = await GET(request(project), params(project));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(query.eq).toHaveBeenCalledWith("id", projectId);
    expect(query.eq).toHaveBeenCalledWith("published", true);
    expect(query.contains).toHaveBeenCalledWith("photo_urls", [mediaUrl(project)]);
  });

  it("protects original downloads behind the staff session", async () => {
    const { GET } = await import("../app/api/admin/media/[...key]/route");
    mocks.requireAdminApi.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: "staff@example.test" });
    expect((await GET(request(catalog, "?view=original"), params(catalog))).status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();

    const from = vi.fn().mockReturnValue({ download: vi.fn().mockResolvedValue({ data: photo }) });
    mocks.createClient.mockReturnValue({ storage: { from } });
    const response = await GET(request(catalog, "?view=original"), params(catalog));
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledExactlyOnceWith(MEDIA_ORIGINALS_BUCKET);
    expect(response.headers.get("content-disposition")).toBe("attachment");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
