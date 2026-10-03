import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {validateMotionStoryboard,sampleMotionTimes,inspectMotionFrame,checkGeometryProbes} from './lib/semantic-motion.mjs';

export async function auditMotionPage(page,board,scene) {
  const times=sampleMotionTimes(scene,board.captions);
  const samples=[], findings=[], framesByTime=new Map();
  await page.waitForFunction(()=>window.__SCENE_READY__===true);
  for(const timeMs of times) {
    await page.evaluate(t=>window.renderAt(t),timeMs);
    const frame=await page.evaluate(inspectMotionFrame,{textManifest:board.textManifest,layoutBoxes:scene.layoutBoxes});
    if(frame.viewport.width!==board.resolution.width||frame.viewport.height!==board.resolution.height||frame.document.width!==board.resolution.width||frame.document.height!==board.resolution.height) frame.errors.push({kind:'viewport-overflow'});
    for(const object of scene.motionContract.objects) if(!frame.objects[object.id]) frame.errors.push({kind:'missing-object',objectId:object.id});
    framesByTime.set(scene.startMs+timeMs,frame);
    frame.errors.push(...checkGeometryProbes(scene,scene.startMs+timeMs,frame,framesByTime));
    const cue=board.captions.find(c=>scene.startMs+timeMs>=c.startMs&&scene.startMs+timeMs<c.endMs);
    if(cue && !frame.texts.some(t=>t.ref===cue.textRef)) frame.errors.push({kind:'caption-sync',expected:cue.textRef});
    findings.push(...frame.errors.map(e=>({timeMs,...e})));
    samples.push({timeMs,texts:frame.texts,objects:frame.objects});
  }
  // Re-seek backwards: geometry and source-visible text must be identical.
  for(const sample of [samples.at(-1),samples[Math.floor(samples.length/2)],samples[0]]) {
    await page.evaluate(t=>window.renderAt(t),sample.timeMs);
    const f=await page.evaluate(inspectMotionFrame,{textManifest:board.textManifest,layoutBoxes:scene.layoutBoxes});
    if(JSON.stringify(f.texts)!==JSON.stringify(sample.texts)||JSON.stringify(f.objects)!==JSON.stringify(sample.objects)) findings.push({kind:'non-deterministic-seek',timeMs:sample.timeMs});
  }
  return {status:findings.length?'failed':'passed',sceneId:scene.sceneId,samplingIntervalMs:250,sampleCount:times.length,findings,samples,semanticReview:'required; geometry does not certify meaning or visual quality'};
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [boardPath,htmlPath,reportPath,sceneId]=process.argv.slice(2);
  if(!boardPath||!htmlPath||!reportPath) throw new Error('Usage: check-semantic-motion.mjs <storyboard> <html> <new-report> [sceneId]');
  const boardBytes=await readFile(resolve(boardPath));
  const htmlBytes=await readFile(resolve(htmlPath));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const board=JSON.parse(boardBytes);
  const errors=validateMotionStoryboard(board);
  if(errors.length) throw new Error(errors.join('\n'));
  const scene=sceneId?board.scenes.find(s=>s.sceneId===sceneId):board.scenes.length===1?board.scenes[0]:null;
  if(!scene) throw new Error('Choose one sceneId for this HTML');
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:board.resolution,deviceScaleFactor:1});
    await page.goto(`${pathToFileURL(resolve(htmlPath)).href}?manual=1`);
    const report=await auditMotionPage(page,board,scene);
    await mkdir(dirname(resolve(reportPath)),{recursive:true});
    await writeFile(resolve(reportPath),JSON.stringify({...report,checkedAt:new Date().toISOString(),inputs:{boardPath,htmlPath,boardSha256:hash(boardBytes),htmlSha256:hash(htmlBytes)}},null,2)+'\n',{flag:'wx'});
    console.log(`${report.status}: ${report.sampleCount} frames; ${report.findings.length} findings`);
    if(report.findings.length) { console.log(JSON.stringify(report.findings.slice(0,8),null,2)); process.exitCode=1; }
  } finally { await browser.close(); }
}
