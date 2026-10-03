export interface AlignmentRequest {
  projectId: string;
  audioPath: string;
  scriptPath: string;
}

/** WhisperX adapter placeholder; intentionally not connected. */
export async function alignVoice(_request: AlignmentRequest): Promise<never> {
  throw new Error("WhisperX provider is disabled: scaffold only");
}
