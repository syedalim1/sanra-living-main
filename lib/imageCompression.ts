export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  minBytes?: number;
}

export interface ImageCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressed: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<ImageCompressionResult> {
  const { maxDimension = 1600, quality = 0.82, minBytes = 100 * 1024 } = options;
  const originalSize = file.size;
  const fallback: ImageCompressionResult = {
    file,
    originalSize,
    compressedSize: originalSize,
    width: 0,
    height: 0,
    compressed: false,
  };

  if (typeof window === "undefined") return fallback;
  if (originalSize <= minBytes) return fallback;
  if (!ACCEPTED_TYPES.includes(file.type)) return fallback;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return fallback;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob || blob.size >= originalSize) {
      return { ...fallback, width, height };
    }

    const compressedFile = new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp", lastModified: Date.now() }
    );

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      width,
      height,
      compressed: true,
    };
  } catch {
    return fallback;
  }
}
