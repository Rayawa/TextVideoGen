import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, link, mkdir, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { spawn } from "node:child_process";

async function pathExists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code ?? signal}: ${stderr.trim()}`));
    });
  });
}

/**
 * Retime and concatenate scene videos in one FFmpeg graph. This preserves each
 * scene's exact frame allocation without writing one re-encoded intermediate
 * file per scene.
 */
export async function composeRetimedScenes({
  allocations,
  sourcePathFor,
  output,
  ffmpeg,
  workspaceDir,
  frameRate,
  preset = "medium",
  crf = 18,
  onCommand,
}) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error("At least one scene allocation is required");
  }
  if (await pathExists(output)) {
    throw new Error(`Refusing to overwrite existing composed video: ${output}`);
  }
  await mkdir(dirname(output), { recursive: true });
  const temporary = join(
    dirname(output),
    `.${basename(output)}.${process.pid}-${randomUUID()}.tmp.mp4`,
  );
  const inputs = allocations.flatMap((allocation) => [
    "-i",
    sourcePathFor(allocation),
  ]);
  const filters = allocations.map(
    (allocation, index) =>
      `[${index}:v]setpts=PTS*${allocation.retimeRatio.toFixed(12)},` +
      `fps=${frameRate},trim=end_frame=${allocation.targetFrameCount},` +
      `setpts=PTS-STARTPTS[v${index}]`,
  );
  filters.push(
    `${allocations.map((_, index) => `[v${index}]`).join("")}` +
      `concat=n=${allocations.length}:v=1:a=0[outv]`,
  );
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(frameRate),
    "-an",
    "-movflags",
    "+faststart",
    temporary,
  ];
  onCommand?.(ffmpeg, args);

  try {
    await run(ffmpeg, args, workspaceDir);
    await link(temporary, output);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }

  return { output, commandArgs: args };
}
