#!/usr/bin/env node
import { access, appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [projectId, stage, status, ...messageParts] = process.argv.slice(2);
const validId = /^[a-z0-9][a-z0-9-]{1,63}$/;
const validStatus = new Set(["started", "completed", "failed", "provider-called", "review-decision", "delivered", "info"]);

if (!projectId || !stage || !status || !validId.test(projectId) || !validStatus.has(status)) {
  console.error("Usage: log-event.mjs <project-id> <stage> <started|completed|failed|provider-called|review-decision|delivered|info> [message]");
  process.exit(2);
}

const projectDir = resolve(root, "projects", projectId);
if (!projectDir.startsWith(resolve(root, "projects") + "/")) throw new Error("Project path escaped projects/");
await access(resolve(projectDir, "project.json"));
const logDir = resolve(projectDir, "logs");
const logFile = resolve(logDir, "events.jsonl");
const event = {
  schemaVersion: 1,
  eventId: randomUUID(),
  timestamp: new Date().toISOString(),
  projectId,
  stage,
  status,
  message: messageParts.join(" ") || undefined,
};

await mkdir(logDir, { recursive: true });
await appendFile(logFile, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o644 });
console.log(`${event.timestamp} ${projectId} ${stage} ${status}`);
