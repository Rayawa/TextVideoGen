#!/usr/bin/env node
// Jacky Motion 2.0 SRT 静态校验：beat / SRT 时间轴 / B-roll / 运行时 / 排版红线
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate-motion-html.mjs path/to/output.html");
  process.exit(2);
}

const html = fs.readFileSync(file, "utf8");
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);
const normalizeText = (value) => String(value)
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/\s+/g, " ")
  .trim();

/* ── content manifest：可见文字与生成素材必须可追溯 ── */
let contentManifest = { text: {}, assets: {} };
const manifestMatch = html.match(/<script[^>]*id=["']content-manifest["'][^>]*>([\s\S]*?)<\/script>/i);
if (!manifestMatch) {
  fail("Missing <script type=\"application/json\" id=\"content-manifest\">.");
} else {
  try {
    contentManifest = JSON.parse(manifestMatch[1]);
    if (!contentManifest.text || typeof contentManifest.text !== "object") fail("content-manifest.text must be an object.");
    if (!contentManifest.assets || typeof contentManifest.assets !== "object") fail("content-manifest.assets must be an object.");
  } catch (error) {
    fail(`Invalid content-manifest JSON: ${error.message}`);
  }
}
const usedAssetIds = new Set();

/* ── 0. 装配占位检查 ── */
const unresolved = [...html.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]);
if (unresolved.length) {
  fail(`Unresolved base-template placeholder(s): ${[...new Set(unresolved)].join(", ")}.`);
}

/* ── 1. beat 登记与属性 ── */
const LAYOUT_IDS = /^(L0[1-9]|L10|LX-[\w-]+)$/;
// 剥离注释后再匹配，避免把基座模板里的示例注释当成真实 beat
const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, "");
const beatMatches = [...htmlNoComments.matchAll(/<section[^>]*class=["'][^"']*\bbeat\b[^"']*["'][^>]*>/gi)];
if (beatMatches.length === 0) fail("No .beat sections found.");
const timing = [];
let motionBeatCount = 0;
let previousMotionSignature = "";

for (let i = 0; i < beatMatches.length; i += 1) {
  const tag = beatMatches[i][0];
  const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1] || `beat#${i + 1}`;
  const body = htmlNoComments.slice(beatMatches[i].index, beatMatches[i + 1]?.index ?? htmlNoComments.length);
  const layout = tag.match(/\bdata-layout=["']([^"']+)["']/i)?.[1];
  const primitive = tag.match(/\bdata-primitive=["']([^"']+)["']/i)?.[1] || "";
  const kind = tag.match(/\bdata-kind=["']([^"']+)["']/i)?.[1] || "";
  const mode = tag.match(/\bdata-mode=["']([^"']+)["']/i)?.[1] || "";
  const motionSignature = tag.match(/\bdata-motion-signature=["']([^"']+)["']/i)?.[1] || "";
  const transition = tag.match(/\bdata-transition=["']([^"']+)["']/i)?.[1] || "";
  const transitionMs = Number(tag.match(/\bdata-transition-ms=["'](\d+)["']/i)?.[1]);
  const textRefs = (tag.match(/\bdata-text-refs=["']([^"']*)["']/i)?.[1] || "").split(",").map((v) => v.trim()).filter(Boolean);
  const assetRefs = (tag.match(/\bdata-asset-refs=["']([^"']*)["']/i)?.[1] || "").split(",").map((v) => v.trim()).filter(Boolean);
  const steps = Number(tag.match(/\bdata-steps=["'](\d+)["']/i)?.[1] || 1);
  const startMs = Number(tag.match(/\bdata-start-ms=["'](\d+)["']/i)?.[1]);
  const endMs = Number(tag.match(/\bdata-end-ms=["'](\d+)["']/i)?.[1]);
  const stepTimesRaw = tag.match(/\bdata-step-times=["']([^"']*)["']/i)?.[1] || "";
  const stepTimes = stepTimesRaw
    ? stepTimesRaw.split(",").map((v) => Number(v.trim())).filter(Number.isFinite)
    : [];
  const isBroll = kind === "broll";

  if (!/^(motion|broll)$/.test(kind)) fail(`${id}: data-kind must be "motion" or "broll".`);
  if (!/^(html|image|hybrid|broll)$/.test(mode)) fail(`${id}: data-mode must be html, image, hybrid, or broll.`);
  if (isBroll && mode !== "broll") fail(`${id}: B-roll beat must use data-mode="broll".`);
  if (!isBroll && mode === "broll") fail(`${id}: motion beat cannot use data-mode="broll".`);
  if (!motionSignature) fail(`${id}: missing data-motion-signature.`);
  if (motionSignature && previousMotionSignature === motionSignature) fail(`${id}: adjacent beat repeats motion signature "${motionSignature}".`);
  previousMotionSignature = motionSignature || previousMotionSignature;

  if (i > 0) {
    if (!/^(crossfade|shared-object|camera|hold|semantic-cut)$/.test(transition)) fail(`${id}: missing or invalid data-transition.`);
    if (!Number.isFinite(transitionMs)) fail(`${id}: missing data-transition-ms.`);
    if (transition === "semantic-cut") {
      if (!/\bdata-hard-cut-reason=["'][^"']+["']/i.test(tag)) fail(`${id}: semantic-cut requires data-hard-cut-reason.`);
    } else if (Number.isFinite(transitionMs) && (transitionMs < 350 || transitionMs > 800)) {
      fail(`${id}: transition duration ${transitionMs}ms is outside the default 350-800ms range.`);
    }
  }

  if (!textRefs.length) fail(`${id}: missing data-text-refs.`);
  const textNodes = [...body.matchAll(/<([a-z][\w:-]*)\b[^>]*data-text-ref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi)];
  const boundTextRefs = new Set();
  let residualBody = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const match of textNodes) {
    const [, , ref, inner] = match;
    boundTextRefs.add(ref);
    const manifestEntry = contentManifest.text?.[ref];
    if (!textRefs.includes(ref)) fail(`${id}: data-text-ref "${ref}" is not declared in data-text-refs.`);
    if (!manifestEntry?.source) fail(`${id}: text ref "${ref}" has no manifest source.`);
    if (manifestEntry && normalizeText(inner) !== normalizeText(manifestEntry.value)) {
      fail(`${id}: visible text for "${ref}" does not match content-manifest value.`);
    }
    residualBody = residualBody.replace(match[0], "");
  }
  for (const ref of textRefs) {
    if (!contentManifest.text?.[ref]) fail(`${id}: declared text ref "${ref}" is missing from content-manifest.`);
    if (!boundTextRefs.has(ref)) fail(`${id}: declared text ref "${ref}" is not bound to visible HTML.`);
  }
  const unboundText = normalizeText(residualBody.replace(/<[^>]+>/g, " "));
  if (unboundText) fail(`${id}: visible text is missing data-text-ref: "${unboundText.slice(0, 60)}".`);

  const usedHere = [...body.matchAll(/\bdata-asset-id=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const assetId of usedHere) {
    usedAssetIds.add(assetId);
    if (!assetRefs.includes(assetId)) fail(`${id}: data-asset-id "${assetId}" is not declared in data-asset-refs.`);
    const asset = contentManifest.assets?.[assetId];
    if (!asset?.path) fail(`${id}: asset "${assetId}" is missing from content-manifest.`);
    else {
      const resolvedAsset = path.resolve(path.dirname(file), asset.path);
      if (!resolvedAsset.startsWith(`${path.dirname(path.resolve(file))}${path.sep}`)) fail(`${id}: asset "${assetId}" escapes the scene directory.`);
      if (!fs.existsSync(resolvedAsset)) fail(`${id}: asset "${assetId}" does not exist at ${asset.path}.`);
    }
  }
  if (/^(image|hybrid)$/.test(mode)) {
    if (!assetRefs.length) fail(`${id}: ${mode} beat requires data-asset-refs.`);
    if (!/<(?:img|picture)\b[^>]*data-asset-id=/i.test(body)) fail(`${id}: ${mode} beat does not visibly consume an image asset.`);
  }
  for (const assetId of assetRefs) {
    if (!contentManifest.assets?.[assetId]) fail(`${id}: declared asset ref "${assetId}" is missing from content-manifest.`);
    if (!usedHere.includes(assetId)) fail(`${id}: declared asset ref "${assetId}" is not consumed in this beat.`);
  }
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    fail(`${id}: invalid or missing data-start-ms/data-end-ms.`);
  } else {
    timing.push({ id, startMs, endMs });
  }
  if (!isBroll) motionBeatCount += 1;

  if (!layout) fail(`${id}: missing data-layout.`);
  else if (!LAYOUT_IDS.test(layout)) fail(`${id}: data-layout "${layout}" is not registered (L01-L10 or LX-<name>).`);
  if (!/\bdata-core=["'][^"']+["']/i.test(tag)) fail(`${id}: missing data-core.`);
  if (!primitive) fail(`${id}: missing data-primitive.`);

  const isCPSE = !isBroll && /^(Contrast|Path|System|Evidence)$/i.test(primitive);
  if (isCPSE && !/\bdata-visual-demo=["'][^"']+["']/i.test(tag)) {
    warn(`${id}: ${primitive} beat should declare data-visual-demo (real visual demonstration, not text reveal).`);
  }
  if (isCPSE && steps < 2) {
    fail(`${id}: ${primitive} beat must have data-steps >= 2 to show a relation change.`);
  }

  if (steps > 1) {
    const stepNums = [...body.matchAll(/\bdata-step=["'](\d+)["']/gi)].map((m) => Number(m[1]));
    if (stepNums.length === 0) {
      fail(`${id}: data-steps=${steps} but no [data-step] elements found.`);
    } else {
      const max = Math.max(...stepNums);
      if (max !== steps) fail(`${id}: data-steps=${steps} but max data-step element is ${max}. They must match.`);
      if (stepNums.some((n) => n < 2)) warn(`${id}: data-step="1" found. Step-1 content should be unmarked (always visible / default enter).`);
    }
  }
  if (steps > 4) fail(`${id}: data-steps=${steps} exceeds the max of 4. Merge steps or split the beat.`);

  if (steps > 1) {
    if (stepTimes.length !== steps - 1) {
      fail(`${id}: data-step-times must contain ${steps - 1} value(s) for steps 2..${steps}.`);
    }
    for (let j = 0; j < stepTimes.length; j += 1) {
      if (stepTimes[j] <= startMs || stepTimes[j] >= endMs) {
        fail(`${id}: step time ${stepTimes[j]} must be inside (${startMs}, ${endMs}).`);
      }
      if (j > 0 && stepTimes[j] <= stepTimes[j - 1]) {
        fail(`${id}: data-step-times must be strictly increasing.`);
      }
    }
  } else if (stepTimes.length) {
    fail(`${id}: data-step-times found on a single-step beat.`);
  }

  if (isBroll) {
    if (layout !== "LX-BROLL") fail(`${id}: B-roll beat must use data-layout="LX-BROLL".`);
    const title = tag.match(/\bdata-broll-title=["']([^"']+)["']/i)?.[1]?.trim() || "";
    if (!title) fail(`${id}: B-roll beat missing data-broll-title.`);
    const titleLength = title.replace(/\s+/g, "").length;
    if (titleLength < 4 || titleLength > 18) fail(`${id}: B-roll title must be 4-18 characters.`);
    if (/(待补|这里放|适合插入|素材占位|随便)/i.test(title)) fail(`${id}: B-roll title is a production note, not a concrete recording subject.`);
    if (title && !body.includes(title)) fail(`${id}: data-broll-title must also appear as the visible frame heading.`);
    if (!/\bbroll-frame\b/i.test(body)) fail(`${id}: B-roll beat missing .broll-frame.`);
    if (steps !== 1) fail(`${id}: B-roll beat must use data-steps="1".`);
  }
}

for (const [assetId, asset] of Object.entries(contentManifest.assets || {})) {
  if (asset?.generated === true && !usedAssetIds.has(assetId)) fail(`Generated asset "${assetId}" is never consumed by HTML.`);
}

for (let i = 1; i < timing.length; i += 1) {
  const prev = timing[i - 1];
  const cur = timing[i];
  if (cur.startMs < prev.startMs) fail(`${cur.id}: beat timing is not in chronological DOM order.`);
  if (cur.startMs < prev.endMs) fail(`${prev.id}/${cur.id}: beat ranges overlap by ${prev.endMs - cur.startMs}ms.`);
  if (cur.startMs - prev.endMs > 500) fail(`${prev.id}/${cur.id}: uncovered SRT gap is ${cur.startMs - prev.endMs}ms (>500ms).`);
}

/* ── 2. 运行时完整性（基座不可改） ── */
for (const marker of ["scaleStage", "applyState", "enterBeat", "toggleFullscreen", "replayBeat", "renderAt", "startCountdown", "currentAutoplayTime", "const TL"]) {
  if (!html.includes(marker)) fail(`Runtime integrity: "${marker}" missing. Do not modify/strip the base-template runtime.`);
}
if (!/#stage\b/i.test(html)) fail("Missing #stage.");
if (!/documentElement\.classList\.add\(['"]js['"]\)/.test(html)) {
  warn("JS-ready class hook not found; no-JS degradation may be broken.");
}
if (!/--stage-w|1920px|1440px/i.test(html)) warn("No fixed stage size token detected.");
const headHtml = html.match(/<head[\s\S]*?<\/head>/i)?.[0] || "";
const headLinks = headHtml
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "");
if (!/<link\b[^>]+href=["'][^"']*(fonts\.googleapis\.com|cdn\.jsdelivr\.net)[^"']*["']/i.test(headLinks)) {
  warn("No webfont <link> found. Did you insert the style's FONT_LINKS into <head>?");
}
if (!/--surface\s*:|--accent\s*:/.test(html)) fail("Style layer tokens missing. Inject assets/styles/{id}.css into the STYLE LAYER block.");

/* ── 3. 时间线纪律 ── */
const gsapTo = [...html.matchAll(/gsap\.to\s*\(/g)];
// 允许 counter 对象补间（gsap.to({...} 或 gsap.to(o,）；对元素目标的 to 提示检查
for (const m of gsapTo) {
  const ctx = html.slice(m.index, m.index + 60);
  if (!/gsap\.to\s*\(\s*(\{|o\b|obj\b|counter\b)/.test(ctx)) {
    warn(`gsap.to(...) on element target found (${ctx.split("\n")[0].trim()}…). Prefer gsap.from/fromTo so the CSS resting state stays the final frame.`);
    break;
  }
}
if (/(setTimeout|setInterval)\s*\(\s*[^)]{0,80}(anim|play|reveal|show|step)/i.test(html)) {
  warn("Timer-driven animation detected. Use TL registry timelines, not setTimeout chains.");
}

/* ── 4. 内容红线 ── */
// 运行时核心区（#stage 自身的 fixed 居中）不参与内容红线检查
const contentHtml = html.replace(/RUNTIME CORE（不可修改）[\s\S]*?STYLE LAYER/, "STYLE LAYER");
if (/position\s*:\s*fixed/i.test(contentHtml)) fail("position:fixed found in content. All controls must live inside #stage.");
if (/\b(tts|voice|speechSynthesis|utterance|\.mp3|\.wav)\b/i.test(html)) {
  fail("Audio/TTS related code found. Pipeline ends at visual acceptance.");
}
const visible = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
const visibleWithoutBroll = visible
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<section[^>]*data-kind=["']broll["'][^>]*>[\s\S]*?<\/section>/gi, "");
if (/(B-roll|旁白窗口|可配口播|适合插入)/i.test(visibleWithoutBroll)) {
  fail("Editing hints leaked outside a designated B-roll beat.");
}

/* ── 5. 排版红线 ── */
if (/letter-spacing\s*:\s*-/i.test(html)) fail("Negative letter-spacing found. Use size/weight/breaks/whitespace instead.");
for (const m of html.matchAll(/line-height\s*:\s*([0-9]*\.?[0-9]+)(?![0-9%p])/gi)) {
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v <= 0 || v > 3) continue;
  if (v < 1) fail(`line-height ${v} too tight for recorded Chinese text.`);
  else if (v > 1 && v < 1.06) warn(`line-height ${v} below Chinese hero breathing range (1.06+).`);
  // 恰好 1 视为大数字/hero-num 的合法设定
}
const negMargin = html.match(/margin(?:-[a-z]+)?\s*:\s*-[0-9.]+/gi) || [];
if (negMargin.length) fail("Negative margin found. Fix layout with grid/flex zones, not overlap patches.");
const centerHits = contentHtml.match(/(?:left|top)\s*:\s*50%/gi) || [];
if (centerHits.length >= 4) fail(`${centerHits.length} absolute 50% centering declarations — center-clustering risk. Use grid zones.`);
else if (centerHits.length >= 2) warn(`${centerHits.length} absolute 50% centering declarations. Check for center clustering.`);

// 中文标题单字孤行（显式 <br> 断行检查）
for (const [, tagName, inner] of html.matchAll(/<(h1|h2|div|span)[^>]*(?:hero-title|quote)[^>]*>([\s\S]*?)<\/\1>/gi)) {
  const lines = String(inner).split(/<br\s*\/?>/i)
    .map((l) => l.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim())
    .filter(Boolean);
  for (const line of lines) {
    const cjk = line.match(/[一-鿿]/g) || [];
    if (cjk.length === 1) fail(`Title has a one-character Chinese line: "${line}".`);
  }
}

// beat CSS 区硬编码颜色（token 纪律）
const beatCss = html.match(/════ BEAT CSS[\s\S]*?════ END BEAT CSS/)?.[0] || "";
const hexHits = beatCss.match(/#[0-9a-f]{3,8}\b/gi) || [];
if (hexHits.length) warn(`${hexHits.length} hardcoded hex color(s) in BEAT CSS (${[...new Set(hexHits)].slice(0, 5).join(", ")}…). Use style-layer tokens.`);

/* ── 6. 结构提示 ── */
const safeBoxCount = (html.match(/\bdata-safe-box=["'][^"']+["']/gi) || []).length;
if (beatMatches.length > 0 && safeBoxCount < beatMatches.length) {
  fail(`Only ${safeBoxCount} data-safe-box marker(s) for ${beatMatches.length} beat(s). Mark every primary title/visual/card/screenshot/node.`);
}
if ((html.match(/<svg[\s\S]*?<text[\s\S]*?<\/svg>/gi) || []).length) {
  warn("SVG <text> found. Prefer HTML labels for layout and validation.");
}
const shotCoverRule = /\.shot[^{]*\{[^}]*object-fit\s*:\s*cover/i.test(html)
  || /\.shot[^{]*img[^{]*\{[^}]*object-fit\s*:\s*cover/i.test(html)
  || /data-safe-box=["']shot["'][\s\S]{0,240}object-fit\s*:\s*cover/i.test(html);
if (shotCoverRule) {
  warn("object-fit:cover found on information screenshots (.shot). Use contain/max dimensions instead.");
}
const tlCount = (html.match(/TL\.(b\w+)\s*=/g) || []).length;
if (motionBeatCount >= 3 && tlCount < Math.ceil(motionBeatCount / 3)) {
  warn(`Only ${tlCount} custom TL timeline(s) for ${motionBeatCount} motion beats. Core beats need signature motion, not just the default enter.`);
}

/* ── 输出 ── */
for (const m of failures) console.error(`FAIL ${m}`);
for (const m of warnings) console.warn(`WARN ${m}`);
if (failures.length) process.exit(1);
console.log(`PASS ${file}`);
if (warnings.length) console.log(`${warnings.length} warning(s). Review before delivery.`);
