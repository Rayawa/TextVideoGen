#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

process.on("uncaughtException", (error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});

const file = process.argv[2];
if (!file) {
  console.error("Usage: node parse-srt.mjs path/to/voiceover.srt");
  process.exit(2);
}

function parseTime(raw) {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error(`Invalid SRT time: ${raw}`);
  const [, hh, mm, ss, ms] = match;
  if (Number(mm) > 59 || Number(ss) > 59) throw new Error(`Invalid SRT time: ${raw}`);
  return (((Number(hh) * 60 + Number(mm)) * 60 + Number(ss)) * 1000) + Number(ms);
}

const source = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const blocks = source.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).filter(Boolean);
const cues = [];

for (const block of blocks) {
  const lines = block.split("\n").map((line) => line.trim());
  const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
  if (timeLineIndex < 0) throw new Error(`Missing time range in block: ${block.slice(0, 80)}`);

  const range = lines[timeLineIndex].match(/^(.+?)\s*-->\s*(\S+)/);
  if (!range) throw new Error(`Invalid time range: ${lines[timeLineIndex]}`);
  const startMs = parseTime(range[1]);
  const endMs = parseTime(range[2]);
  if (endMs <= startMs) throw new Error(`Cue end must be after start: ${lines[timeLineIndex]}`);

  const text = lines.slice(timeLineIndex + 1)
    .join(" ")
    .replace(/<[^>]*>/g, "")
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) throw new Error(`Cue at ${range[1]} has no text.`);

  const declaredIndex = Number(lines[0]);
  cues.push({
    index: Number.isInteger(declaredIndex) && timeLineIndex > 0 ? declaredIndex : cues.length + 1,
    startMs,
    endMs,
    text
  });
}

if (!cues.length) throw new Error("SRT contains no cues.");

cues.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
for (let i = 1; i < cues.length; i += 1) {
  if (cues[i].startMs < cues[i - 1].endMs) {
    throw new Error(`Overlapping cues: ${cues[i - 1].index} and ${cues[i].index}.`);
  }
}

console.log(JSON.stringify({
  source: path.basename(file),
  durationMs: cues.at(-1).endMs,
  cues
}, null, 2));
