#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const input = process.argv[2];
const outDir = process.argv[3] || "";

if (!input) {
  console.error("Usage: node check-layout-browser.mjs path/to/output.html [screenshot-dir]");
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.warn("SKIP Playwright is not available. Browser layout check is optional; use agent/browser screenshot review or manual screenshot review.");
  process.exit(0);
}

const fileUrl = pathToFileURL(path.resolve(input)).href;
const failures = [];
const warnings = [];
const SAFE_GAP = 48;

function overlapRatio(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const area = x * y;
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  return minArea ? area / minArea : 0;
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

function expandBox(box, gap) {
  return {
    ...box,
    left: box.left - gap,
    top: box.top - gap,
    right: box.right + gap,
    bottom: box.bottom + gap,
    width: box.width + gap * 2,
    height: box.height + gap * 2
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(fileUrl);
await page.waitForTimeout(600);
await page.evaluate(() => {
  const gate = document.getElementById("autoplayGate");
  if (gate) gate.hidden = true;
  document.body.classList.remove("autoplay-running");
});

const beatCount = await page.locator(".beat").count();
if (beatCount === 0) failures.push("No .beat sections found.");

if (outDir) fs.mkdirSync(outDir, { recursive: true });

for (let index = 0; index < beatCount; index += 1) {
  await page.evaluate((activeIndex) => {
    if (typeof window.enterBeat === "function") {
      window.enterBeat(activeIndex, true);
      return;
    }

    document.querySelectorAll(".beat").forEach((beat, i) => {
      const active = i === activeIndex;
      beat.classList.toggle("active", active);
      beat.style.display = active ? "block" : "none";
      beat.style.opacity = "1";
      beat.style.visibility = "visible";
      if (!active) return;
      const finalStep = Math.max(1, Number(beat.dataset.steps || 1));
      beat.dataset.currentStep = finalStep;
      beat.querySelectorAll("[data-step]").forEach((el) => {
        el.classList.toggle("on", Number(el.dataset.step) <= finalStep);
      });
      beat.querySelectorAll("[data-dim-at]").forEach((el) => {
        el.classList.toggle("dim", Number(el.dataset.dimAt) <= finalStep);
      });
    });
  }, index);
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const beat = document.querySelector(".beat.active");
    const beatName = beat?.id || beat?.dataset.layout || `beat-${[...document.querySelectorAll(".beat")].indexOf(beat) + 1}`;
    const stage = document.querySelector("#stage");
    const nav = document.querySelector("#nav,.nav,[data-nav]");
    const elements = [...document.querySelectorAll(".beat.active [data-safe-box]")].map((el, i) => {
      const rect = el.getBoundingClientRect();
      return {
        label: el.getAttribute("data-safe-box") || el.id || el.className || `safe-box-${i + 1}`,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        allowOverlap: el.getAttribute("data-safe-overlap") === "true"
      };
    }).filter((box) => box.width > 0 && box.height > 0);
    const navBox = nav ? (() => {
      const rect = nav.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    })() : null;
    const stageBox = stage ? (() => {
      const rect = stage.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    })() : null;
    return { beatName, elements, navBox, stageBox };
  });

  if (result.elements.length === 0) {
    failures.push(`${result.beatName}: no [data-safe-box] elements found; browser overlap check cannot verify layout.`);
  }

  for (let a = 0; a < result.elements.length; a += 1) {
    for (let b = a + 1; b < result.elements.length; b += 1) {
      if (result.elements[a].allowOverlap || result.elements[b].allowOverlap) continue;
      const ratio = overlapRatio(result.elements[a], result.elements[b]);
      const area = overlapArea(result.elements[a], result.elements[b]);
      if (ratio > 0.01 || area > 16) {
        failures.push(`${result.beatName}: ${result.elements[a].label} overlaps ${result.elements[b].label} (${Math.round(ratio * 100)}%).`);
        continue;
      }
      const expandedA = expandBox(result.elements[a], SAFE_GAP / 2);
      const expandedB = expandBox(result.elements[b], SAFE_GAP / 2);
      if (overlapArea(expandedA, expandedB) > 0) {
        failures.push(`${result.beatName}: ${result.elements[a].label} is too close to ${result.elements[b].label}; keep at least ${SAFE_GAP}px safe gap.`);
      }
    }
  }

  if (result.navBox) {
    for (const box of result.elements) {
      const ratio = overlapRatio(box, result.navBox);
      if (ratio > 0) failures.push(`${result.beatName}: ${box.label} collides with nav.`);
      if (result.stageBox && box.bottom > result.stageBox.bottom - 96) {
        failures.push(`${result.beatName}: ${box.label} enters 96px bottom nav safe zone.`);
      }
    }
  }

  if (outDir) {
    await page.screenshot({ path: path.join(outDir, `beat-${String(index + 1).padStart(2, "0")}.png`) });
  }
}

await browser.close();

for (const message of failures) console.error(`FAIL ${message}`);
for (const message of warnings) console.warn(`WARN ${message}`);

if (failures.length) process.exit(1);
console.log(`PASS ${input}`);
if (warnings.length) console.log(`${warnings.length} warning(s). Review screenshots manually.`);
