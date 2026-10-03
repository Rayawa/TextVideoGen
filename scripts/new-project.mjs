#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [projectId, ...titleParts] = process.argv.slice(2);
if (!projectId || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(projectId)) {
  console.error("Usage: new-project.mjs <lowercase-project-id> [title]");
  process.exit(2);
}

const projectDir = resolve(root, "projects", projectId);
const projectFile = resolve(projectDir, "project.json");
try {
  await access(projectFile, constants.F_OK);
  throw new Error(`Project already exists: ${projectId}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

for (const name of ["source", "plan", "scenes", "work", "qa", "logs", "deliveries"]) {
  await mkdir(resolve(projectDir, name), { recursive: true });
  await writeFile(resolve(projectDir, name, ".gitkeep"), "", { flag: "wx" }).catch((error) => {
    if (error?.code !== "EEXIST") throw error;
  });
}

const now = new Date().toISOString();
const project = {
  schemaVersion: 2,
  projectId,
  title: titleParts.join(" ") || projectId,
  status: "draft",
  workflowStage: "script",
  createdAt: now,
  updatedAt: now,
  layout: { source: "source", plan: "plan", scenes: "scenes", work: "work", qa: "qa", logs: "logs", deliveries: "deliveries" },
  artifacts: {},
  renderHistory: [],
};
await writeFile(projectFile, `${JSON.stringify(project, null, 2)}\n`, { flag: "wx" });
console.log(projectDir);
