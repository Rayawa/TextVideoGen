#!/usr/bin/env node
import { access, appendFile, copyFile, link, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [projectId, sourceArg, version = "final"] = process.argv.slice(2);
if (!projectId || !sourceArg || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(projectId) || !/^[A-Za-z0-9._-]{1,80}$/.test(version)) {
  console.error("Usage: deliver-video.mjs <project-id> <project-candidate.mp4> [version]");
  process.exit(2);
}

const projectDir = resolve(root, "projects", projectId);
const projectFile = resolve(projectDir, "project.json");
const project = JSON.parse(await readFile(projectFile, "utf8"));
if (project.status !== "approved") {
  throw new Error(`Project ${projectId} is not approved. Set project.json status to \"approved\" only after final review.`);
}

const source = resolve(root, sourceArg);
if (!source.startsWith(`${projectDir}/`)) throw new Error("Delivery source must be inside the selected project.");
if (extname(source).toLowerCase() !== ".mp4") throw new Error("Final delivery source must be an .mp4 file.");
const sourceStat = await stat(source);
if (!sourceStat.isFile()) throw new Error("Delivery source is not a regular file.");

const finalRoot = resolve(process.env.VIDEOTEXTGEN_FINALS_DIR || "/Users/raychen/Movies/VideoTextGen");
const finalDir = resolve(finalRoot, projectId);
const destination = resolve(finalDir, `${version}.mp4`);
if (!destination.startsWith(`${finalRoot}/`)) throw new Error("Final destination escaped the configured Movies directory.");
await mkdir(finalDir, { recursive: true });
try {
  await access(destination, constants.F_OK);
  throw new Error(`Refusing to overwrite existing delivery: ${destination}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const temporary = resolve(finalDir, `.${basename(destination)}.${randomUUID()}.tmp`);
try {
  await link(source, destination);
  await unlink(source);
} catch (error) {
  if (error?.code !== "EXDEV") throw error;
  await copyFile(source, temporary, 0x1);
  await link(temporary, destination);
  await unlink(temporary);
  await unlink(source);
}

const hash = createHash("sha256");
await new Promise((done, reject) => createReadStream(destination).on("data", (chunk) => hash.update(chunk)).on("end", done).on("error", reject));
const record = {
  schemaVersion: 1,
  projectId,
  version,
  deliveredAt: new Date().toISOString(),
  destination,
  sourceRelativePath: source.slice(projectDir.length + 1),
  bytes: (await stat(destination)).size,
  sha256: hash.digest("hex"),
};
const deliveriesDir = resolve(projectDir, "deliveries");
await mkdir(deliveriesDir, { recursive: true });
await mkdir(resolve(projectDir, "logs"), { recursive: true });
await writeFile(resolve(deliveriesDir, `${version}.json`), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
await appendFile(resolve(projectDir, "logs", "events.jsonl"), `${JSON.stringify({
  schemaVersion: 1,
  eventId: randomUUID(),
  timestamp: record.deliveredAt,
  projectId,
  stage: "deliver",
  status: "delivered",
  message: destination,
  details: { version, bytes: record.bytes, sha256: record.sha256 },
})}\n`);
console.log(destination);
