import sharp from "sharp";

export type MediaProfile = "catalog" | "project" | "order" | "swatch";

export const WATERMARK_MARKER = "https://www.sanraliving.com/media/watermark/v1";
const XMP = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:sanra="https://www.sanraliving.com/media/" sanra:watermark="${WATERMARK_MARKER}"/></rdf:RDF></x:xmpmeta>`;

const profiles: Record<MediaProfile, { width: number; opacity: number; quality: number }> = {
  catalog: { width: .73, opacity: .39, quality: 85 },
  project: { width: .86, opacity: .58, quality: 84 },
  order: { width: .78, opacity: .48, quality: 84 },
  swatch: { width: .64, opacity: .25, quality: 89 },
};

const formats = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export interface ProtectedImage {
  buffer: Buffer;
  mobile: Buffer;
  width: number;
  height: number;
  sourceType: (typeof formats)[keyof typeof formats];
}

function watermarkSvg(
  width: number,
  height: number,
  profile: MediaProfile,
  luminance: number,
  logo: Buffer | null
) {
  const style = profiles[profile];
  const size = Math.min(width * style.width / 8.1, height * .18, 150);
  const white = luminance < .59;
  const fill = white ? "#fff" : "#151b18";
  const stroke = white ? "#141b17" : "#fff";
  const opacity = style.opacity + (luminance > .42 && luminance < .65 ? .06 : 0);
  const secondSize = size * .39;
  const domainSize = Math.min(size * .36, height * .13);
  const center = height * .50;
  const logoSize = Math.min(size * 1.32, height * .19);
  const logoSvg = logo
    ? '<image href="data:image/png;base64,' + logo.toString("base64") + '" x="' + (width - logoSize * 2) / 2 + '" y="' + (center - size * .58 - logoSize) + '" width="' + logoSize * 2 + '" height="' + logoSize + '"/>'
    : "";
  const text = (value: string, x: number, y: number, font: number, anchor: string) =>
    '<text x="' + x + '" y="' + y + '" font-size="' + font + '" text-anchor="' + anchor +
    '" stroke-width="' + font * .03 + '">' + value + '</text>';

  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
      '<g opacity="' + opacity + '" fill="' + fill + '" stroke="' + stroke + '" stroke-opacity=".56" paint-order="stroke fill" font-family="Arial, sans-serif" font-weight="700">' +
      logoSvg +
      text("SANRA LIVING", width / 2, center + size * .16, size, "middle") +
      text("INDIAN MAKE STEEL INDUSTRIES", width / 2, center + size * .65, secondSize, "middle") +
      '</g><g opacity="' + Math.min(.8, opacity + .17) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-opacity=".8" paint-order="stroke fill" font-family="Arial, sans-serif" font-weight="700">' +
      text("sanraliving.com", width - Math.max(domainSize * .8, width * .035), height - Math.max(domainSize * .8, height * .05), domainSize, "end") +
      '</g></svg>'
  );
}

export async function renderProtectedImage(
  input: Buffer,
  profile: MediaProfile,
  logo: Buffer | null = null
): Promise<ProtectedImage> {
  const base = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 });
  const meta = await base.metadata();
  const sourceType = formats[meta.format as keyof typeof formats];
  if (!sourceType || (meta.pages ?? 1) > 1) throw new Error("Only still JPG, PNG and WebP images are accepted.");
  if (meta.xmp?.includes(WATERMARK_MARKER)) throw new Error("This derivative is already watermarked. Use the original to regenerate.");

  // Keep the intermediate lossless. Normalize orientation and remove metadata from public bytes.
  const { data, info } = await base.rotate().resize({
    width: 1600, height: 1600, fit: "inside", withoutEnlargement: true,
  }).toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const image = () => sharp(data, { raw: { width, height, channels } });
  const centerWidth = Math.max(1, Math.floor(width * .7));
  const centerHeight = Math.max(1, Math.floor(height * .3));
  const { channels: stats } = await image().extract({
    left: Math.floor((width - centerWidth) / 2),
    top: Math.floor((height - centerHeight) / 2),
    width: centerWidth,
    height: centerHeight,
  }).flatten({ background: "#f2f0eb" }).raw().toBuffer().then((sample) =>
    sharp(sample, { raw: { width: centerWidth, height: centerHeight, channels: 3 } }).stats()
  );
  const luminance = (stats[0].mean * .213 + stats[1].mean * .715 + stats[2].mean * .072) / 255;

  const composited = await image()
    .composite([{ input: watermarkSvg(width, height, profile, luminance, logo) }])
    .png()
    .toBuffer();
  const encode = (max: number) => sharp(composited)
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .withXmp(XMP)
    .webp({ quality: profiles[profile].quality, effort: 4 })
    .toBuffer();
  const buffer = await encode(1600);
  const mobile = Math.max(width, height) > 640 ? await encode(640) : buffer;
  return { buffer, mobile, width, height, sourceType };
}
