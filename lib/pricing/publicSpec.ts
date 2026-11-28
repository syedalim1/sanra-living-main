import "server-only";

export interface PublicProductSpec {
  pipe_spec: string | null;
}

/**
 * Private pipe specifications are never exposed to public product pages.
 */
export async function getPublicProductSpec(
  _productId: string
): Promise<PublicProductSpec> {
  return { pipe_spec: null };
}
