export interface VoiceboxRequest {
  projectId: string;
  scriptVersion: string;
  text: string;
}

export interface VoiceboxResult {
  audioPath: string;
  providerMetadata: Record<string, unknown>;
}

/** Voicebox/MCP adapter placeholder; intentionally not connected. */
export async function synthesizeVoice(_request: VoiceboxRequest): Promise<VoiceboxResult> {
  throw new Error("Voicebox provider is disabled: scaffold only");
}
