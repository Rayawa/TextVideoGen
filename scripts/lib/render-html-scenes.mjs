import { availableParallelism } from "node:os";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { access, link, mkdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const DEFAULT_RENDER_CONCURRENCY = Math.max(
  1,
  Math.min(2, availableParallelism() - 1),
);

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer, received ${value}`);
  }
  return parsed;
}

export function renderConcurrencyFromEnv(value = process.env.VTX_RENDER_CONCURRENCY) {
  return positiveInteger(value, DEFAULT_RENDER_CONCURRENCY, "render concurrency");
}

async function pathExists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function startJpegEncoder({
  ffmpeg,
  workspaceDir,
  output,
  fps,
  frameCount,
  preset,
  crf,
}) {
  const temporary = join(
    dirname(output),
    `.${basename(output)}.${process.pid}-${randomUUID()}.tmp.mp4`,
  );
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "image2pipe",
    "-framerate",
    String(fps),
    "-vcodec",
    "mjpeg",
    "-i",
    "pipe:0",
    "-frames:v",
    String(frameCount),
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-an",
    "-movflags",
    "+faststart",
    temporary,
  ];
  const child = spawn(ffmpeg, args, {
    cwd: workspaceDir,
    env: process.env,
    stdio: ["pipe", "ignore", "pipe"],
  });
  let stderr = "";
  let stdinError;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.on("error", (error) => {
    stdinError = error;
  });
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code ?? signal}: ${(stderr || stdinError?.message || "unknown error").trim()}`));
    });
  });
  // Attach a handler immediately in case FFmpeg exits while Playwright is
  // still producing a frame; the original promise remains rejectable below.
  completed.catch(() => undefined);
  return { child, completed, temporary, args };
}

async function writeFrame(stream, buffer) {
  if (stream.destroyed) throw new Error("FFmpeg input closed before all frames were written");
  if (stream.write(buffer)) return;
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off("drain", onDrain);
      stream.off("error", onError);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    stream.once("drain", onDrain);
    stream.once("error", onError);
  });
}

async function renderScene({
  page,
  scene,
  html,
  output,
  ffmpeg,
  workspaceDir,
  viewport,
  fps,
  jpegQuality,
  preset,
  crf,
  keepFramesRoot,
  validatePage,
}) {
  if (await pathExists(output)) {
    throw new Error(`Refusing to overwrite existing scene render: ${output}`);
  }
  await mkdir(dirname(output), { recursive: true });
  await page.goto(`${pathToFileURL(html).href}?manual=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__SCENE_READY__ === true);
  const dimensions = await page.evaluate(() => ({
    body: [document.body.scrollWidth, document.body.scrollHeight],
    viewport: [innerWidth, innerHeight],
  }));
  const expected = [viewport.width, viewport.height];
  if (
    dimensions.body[0] !== expected[0] ||
    dimensions.body[1] !== expected[1] ||
    dimensions.viewport[0] !== expected[0] ||
    dimensions.viewport[1] !== expected[1]
  ) {
    throw new Error(`${scene.sceneId} viewport mismatch: ${JSON.stringify(dimensions)}`);
  }
  if (validatePage) await validatePage(page, scene);

  const durationMs = scene.endMs - scene.startMs;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`${scene.sceneId} has invalid duration: ${durationMs}ms`);
  }
  const frameCount = Math.ceil((durationMs * fps) / 1000);
  const frameDir = keepFramesRoot ? join(keepFramesRoot, scene.sceneId) : null;
  if (frameDir) await mkdir(frameDir, { recursive: true });
  const encoder = startJpegEncoder({
    ffmpeg,
    workspaceDir,
    output,
    fps,
    frameCount,
    preset,
    crf,
  });
  const startedAt = performance.now();

  try {
    for (let index = 0; index < frameCount; index += 1) {
      const timeMs = Math.min(durationMs - 1, (index * 1000) / fps);
      await page.evaluate((value) => window.renderAt(value), timeMs);
      const jpeg = await page.screenshot({ type: "jpeg", quality: jpegQuality });
      if (frameDir) {
        await writeFile(join(frameDir, `${String(index).padStart(5, "0")}.jpg`), jpeg);
      }
      await writeFrame(encoder.child.stdin, jpeg);
    }
    encoder.child.stdin.end();
    await encoder.completed;
    await link(encoder.temporary, output);
  } catch (error) {
    encoder.child.stdin.destroy();
    encoder.child.kill("SIGTERM");
    await encoder.completed.catch(() => undefined);
    throw error;
  } finally {
    await unlink(encoder.temporary).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }

  return {
    sceneId: scene.sceneId,
    frameCount,
    durationMs,
    elapsedMs: Math.round(performance.now() - startedAt),
    output,
    commandArgs: encoder.args,
  };
}

/**
 * Render independent deterministic HTML scenes with a bounded page pool.
 * JPEG buffers are piped directly into FFmpeg, so capture and encoding overlap
 * without retaining hundreds of megabytes of disposable frame files.
 */
export async function renderHtmlScenes({
  scenes,
  htmlPathFor,
  outputPathFor,
  ffmpeg,
  workspaceDir,
  viewport,
  fps = 30,
  jpegQuality = 88,
  preset = "medium",
  crf = 18,
  concurrency = DEFAULT_RENDER_CONCURRENCY,
  keepFramesRoot,
  validatePage,
  onSceneRendered,
  browserLaunchArgs = [],
  productionProfile,
}) {
  if (!Array.isArray(scenes) || scenes.length === 0) return [];
  fps = positiveInteger(fps, 30, "render fps");
  if (productionProfile === "semantic-motion" && fps < 30) {
    throw new Error("semantic-motion requires actual source rendering at >=30 fps");
  }
  const workerCount = Math.min(
    scenes.length,
    positiveInteger(concurrency, DEFAULT_RENDER_CONCURRENCY, "render concurrency"),
  );
  const results = new Array(scenes.length);
  const browser = await chromium.launch({ headless: true, args: browserLaunchArgs });
  let nextIndex = 0;

  try {
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
        try {
          while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= scenes.length) break;
            const scene = scenes[index];
            const result = await renderScene({
              page,
              scene,
              html: htmlPathFor(scene),
              output: outputPathFor(scene),
              ffmpeg,
              workspaceDir,
              viewport,
              fps,
              jpegQuality,
              preset,
              crf,
              keepFramesRoot,
              validatePage,
            });
            results[index] = result;
            await onSceneRendered?.(result, scene);
          }
        } finally {
          await page.close();
        }
      }),
    );
  } finally {
    await browser.close();
  }

  return results;
}
