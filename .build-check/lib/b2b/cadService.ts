export interface CadDownloadDependencies {
  saveLead: () => Promise<void>;
  createSignedUrl: () => Promise<string>;
}

export type CadDownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export const CAD_DOWNLOAD_ERROR =
  "Could not prepare this model download. Please try again.";

export async function requestCadDownload(
  dependencies: CadDownloadDependencies
): Promise<CadDownloadResult> {
  try {
    await dependencies.saveLead();
  } catch {
    return { ok: false, error: CAD_DOWNLOAD_ERROR };
  }

  try {
    const url = await dependencies.createSignedUrl();
    if (!url) return { ok: false, error: CAD_DOWNLOAD_ERROR };
    return { ok: true, url };
  } catch {
    return { ok: false, error: CAD_DOWNLOAD_ERROR };
  }
}
