import { chmod, lstat, mkdir, symlink, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const binDir = resolve(root, ".videoenv/bin");

async function replaceGeneratedLink(name, target) {
  if (!target) throw new Error(`${name} package did not expose a binary path`);
  const link = resolve(binDir, name);
  try {
    const existing = await lstat(link);
    if (!existing.isSymbolicLink()) {
      throw new Error(`Refusing to replace non-symlink runtime binary: ${link}`);
    }
    await unlink(link);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await chmod(target, 0o755);
  await symlink(target, link);
  console.log(`${name} -> ${target}`);
}

await mkdir(binDir, { recursive: true });
await replaceGeneratedLink("ffmpeg", ffmpegPath);
await replaceGeneratedLink("ffprobe", ffprobeStatic.path);
