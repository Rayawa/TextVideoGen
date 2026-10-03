import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {validateMotionStoryboard,inspectMotionFrame,checkGeometryProbes,sampleMotionTimes} from '../lib/semantic-motion.mjs';
import {renderHtmlScenes} from '../lib/render-html-scenes.mjs';
test('semantic profile rejects duplicated low frame rate at rendering boundary',async()=>{
 await assert.rejects(()=>renderHtmlScenes({scenes:[{}],fps:15,productionProfile:'semantic-motion'}),/>=30 fps/);
 await assert.rejects(()=>renderHtmlScenes({scenes:[{}],fps:-1}),/positive integer/);
});
const fixture=()=>({productionProfile:'semantic-motion',textManifest:{a:{value:'听力',source:'source.txt'},b:{value:'阅读',source:'source.txt'}},captions:[{index:1,startMs:0,endMs:1000,textRef:'a'},{index:2,startMs:1000,endMs:2000,textRef:'b'}],scenes:[{sceneId:'one',startMs:0,endMs:2000,mode:'html',textRefs:['a','b'],assetRefs:[],motionSignature:'traction',transition:{type:'hold',durationMs:0},layoutBoxes:{main:{x:0,y:0,width:300,height:200}},motionContract:{renderer:'dom-svg',objects:[{id:'head',role:'leader',continuity:'same object'},{id:'tail',role:'follower',continuity:'same object'}],beats:[{startMs:0,endMs:1000,meaning:'leader starts',before:'still',action:'head moves',after:'head ahead',objectIds:['head','tail'],signature:'traction',cueIndexes:[1]},{startMs:1000,endMs:2000,meaning:'follower follows',before:'tail still',action:'tail moves',after:'coupled',objectIds:['head','tail'],signature:'follow',cueIndexes:[2]}],probes:[{atMs:900,meaning:'head is ahead',assertions:[{left:{objectId:'head',property:'x'},op:'gt',right:{objectId:'tail',property:'x'}}]}],reviewQuestions:['Is the traction clear?']}}]});
test('contract rejects unsupported source text, repeated actions and unaligned beats',()=>{
 assert.deepEqual(validateMotionStoryboard(fixture()),[]);
 const b=fixture();b.scenes[0].textRefs.push('invented');b.scenes[0].motionContract.beats[1].signature='traction';b.scenes[0].motionContract.beats[1].cueIndexes=[99];
 const errors=validateMotionStoryboard(b).join('\n');assert.match(errors,/unresolved text/);assert.match(errors,/repeated adjacent/);assert.match(errors,/alignment evidence/);
});
test('sampling includes both sides of captions, action midpoints and probes',()=>{
 const b=fixture(),times=sampleMotionTimes(b.scenes[0],b.captions);
 for(const t of [0,500,900,999,1000,1500,1999])assert.ok(times.includes(t));
});
test('geometry assertion fails on missing objects and reversed relationship',()=>{
 const s=fixture().scenes[0];assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:200},tail:{x:20}}}).length,0);
 assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:20},tail:{x:200}}}).length,1);
 assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:200}}}).length,1);
});
test('movement probes distinguish leading position from actual earlier movement',()=>{
 const s=fixture().scenes[0];s.motionContract.probes[0].assertions=[{left:{objectId:'head',property:'x'},op:'gt',right:100,changeFromMs:0},{left:{objectId:'tail',property:'x'},op:'eq',right:0,changeFromMs:0}];
 const before=new Map([[0,{objects:{head:{x:0},tail:{x:0}}}]]);
 assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:150},tail:{x:0}}},before).length,0);
 assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:150},tail:{x:100}}},before).length,1);
 assert.equal(checkGeometryProbes(s,900,{objects:{head:{x:150},tail:{x:0}}}).length,2);
});
test('browser checks real overlaps, SVG labels, source mismatch and animated safe bounds',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:300,height:200}});
  await page.setContent('<style>body{margin:0}div{position:absolute;font:30px sans-serif}</style><div data-text-ref="a" data-layout-box="main" style="left:10px;top:10px">听力</div><div data-text-ref="b" data-layout-box="main" style="left:20px;top:10px">阅读</div><svg width="300" height="200"><text data-text-ref="a" data-layout-box="main" x="280" y="180" font-size="30">听力</text></svg>');
  const b=fixture();let f=await page.evaluate(inspectMotionFrame,{textManifest:b.textManifest,layoutBoxes:b.scenes[0].layoutBoxes});
  assert.ok(f.errors.some(e=>e.kind==='text-overlap'));assert.ok(f.errors.some(e=>e.kind==='text-outside-layout'));
  await page.locator('div[data-text-ref="b"]').evaluate(el=>{el.textContent='捏造';});
  f=await page.evaluate(inspectMotionFrame,{textManifest:b.textManifest,layoutBoxes:b.scenes[0].layoutBoxes});assert.ok(f.errors.some(e=>e.kind==='text-source'));
  await page.locator('div[data-text-ref="a"]').evaluate(el=>{el.style.opacity='0';});
  f=await page.evaluate(inspectMotionFrame,{textManifest:b.textManifest,layoutBoxes:b.scenes[0].layoutBoxes});assert.equal(f.errors.filter(e=>e.kind==='text-overlap').length,0);
 } finally {await browser.close();}
});
