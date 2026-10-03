export interface ImageAssetRequest {
  projectId: string;
  sceneId: string;
  assetId: string;
  prompt: string;
}

/** Image skill adapter placeholder; generation is not implemented. */
export async function requestImage(_request: ImageAssetRequest): Promise<never> {
  throw new Error("Image provider is disabled: scaffold only");
}
