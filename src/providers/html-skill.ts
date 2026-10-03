export interface HtmlMotionRequest {
  projectId: string;
  sceneId: string;
  assetId: string;
  durationMs: number;
}

/** HTML motion skill adapter placeholder; generation/rendering is not implemented. */
export async function requestHtmlMotion(_request: HtmlMotionRequest): Promise<never> {
  throw new Error("HTML motion provider is disabled: scaffold only");
}
