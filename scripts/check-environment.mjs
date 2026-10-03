import { spawnSync } from "node:child_process";
import { accessSync, constants, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const expectedPrefix = `${root}/`;

function run(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stderr || result.stdout}`);
  }
  const firstLine = (result.stdout || result.stderr).trim().split("\n")[0];
  console.log(`PASS ${label}: ${firstLine}`);
}

function requireProjectPath(label, path) {
  accessSync(path, constants.R_OK);
  const resolved = realpathSync(path);
  if (!resolved.startsWith(expectedPrefix)) {
    throw new Error(`${label} escaped the workspace: ${resolved}`);
  }
  console.log(`PASS ${label}: ${resolved}`);
}

requireProjectPath("node", resolve(root, ".videoenv/node/bin/node"));
requireProjectPath("python", resolve(root, ".videoenv/python/bin/python"));
requireProjectPath("ffmpeg", resolve(root, ".videoenv/bin/ffmpeg"));
requireProjectPath("ffprobe", resolve(root, ".videoenv/bin/ffprobe"));

run("Node", "node", ["--version"]);
run("pnpm", "pnpm", ["--version"]);
run("FFmpeg", "ffmpeg", ["-version"]);
run("FFprobe", "ffprobe", ["-version"]);
run("Python", "python", ["--version"]);
run("uv", "uv", ["--version"]);
run("WhisperX", "whisperx", ["--version"]);
run("Python alignment imports", "python", ["-c", "import ctranslate2, faster_whisper, torch, whisperx; print('imports ok')"]);
run("Playwright", "playwright", ["--version"]);
run("Chromium launch", "node", ["-e", "import('playwright').then(async({chromium})=>{const b=await chromium.launch({headless:true});const p=await b.newPage();await p.setContent('<title>ok</title>');if(await p.title()!=='ok')process.exit(2);await b.close();console.log('launch ok')})"]);

console.log("Environment verification complete. No model inference was run.");
