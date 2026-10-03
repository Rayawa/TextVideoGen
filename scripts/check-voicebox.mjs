import { accessSync, constants, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const quiet = process.argv.includes("--quiet");
const modelRoot = resolve(root, ".videoenv/voicebox/models");
const expectedModel = resolve(
  modelRoot,
  "models--mlx-community--Qwen3-TTS-12Hz-1.7B-Base-bf16",
);
const baseUrl = `http://127.0.0.1:${process.env.VOICEBOX_PORT || "17493"}`;

function report(message) {
  if (!quiet) console.log(message);
}

try {
  accessSync(expectedModel, constants.R_OK);
  const resolvedModel = realpathSync(expectedModel);
  if (!resolvedModel.startsWith(`${root}/`)) {
    throw new Error(`Voicebox model escaped the workspace: ${resolvedModel}`);
  }

  const healthResponse = await fetch(`${baseUrl}/health`, {
    signal: AbortSignal.timeout(2_000),
  });
  if (!healthResponse.ok) {
    throw new Error(`/health returned HTTP ${healthResponse.status}`);
  }
  const health = await healthResponse.json();

  const modelsResponse = await fetch(`${baseUrl}/models/status`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!modelsResponse.ok) {
    throw new Error(`/models/status returned HTTP ${modelsResponse.status}`);
  }
  const models = await modelsResponse.json();
  const targetModel = models.models?.find(
    (model) => model.model_name === "qwen-tts-1.7B",
  );
  if (!targetModel?.downloaded) {
    throw new Error("Qwen TTS 1.7B is not marked as downloaded");
  }

  report(`PASS Voicebox health: ${JSON.stringify(health)}`);
  report(`PASS Voicebox model root: ${resolvedModel}`);
  report(`PASS Voicebox model status: ${JSON.stringify(targetModel)}`);
} catch (error) {
  if (!quiet) console.error(`FAIL Voicebox: ${error.message}`);
  process.exit(1);
}
