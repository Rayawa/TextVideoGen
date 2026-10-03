export function validateMotionStoryboard(board) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (board.productionProfile !== 'semantic-motion') fail('productionProfile must be semantic-motion');
  if (!board.textManifest || !Array.isArray(board.scenes) || !board.scenes.length) return ['Missing textManifest or scenes'];
  const ids = new Set();
  let previous;
  for (const scene of board.scenes) {
    const at = scene.sceneId;
    if (!at || ids.has(at)) fail(`${at}: missing or duplicate sceneId`);
    ids.add(at);
    if (!Number.isInteger(scene.startMs) || !Number.isInteger(scene.endMs) || scene.endMs <= scene.startMs) fail(`${at}: invalid time range`);
    if (previous && scene.startMs !== previous.endMs) fail(`${at}: scene gap or overlap`);
    if (!['html', 'image', 'hybrid', 'broll'].includes(scene.mode)) fail(`${at}: invalid mode`);
    if (!Array.isArray(scene.textRefs)) fail(`${at}: missing textRefs`);
    for (const ref of scene.textRefs ?? []) if (!board.textManifest[ref]?.value || !board.textManifest[ref]?.source) fail(`${at}: unresolved text ${ref}`);
    if (!Array.isArray(scene.assetRefs) || (['image', 'hybrid'].includes(scene.mode) && !scene.assetRefs.length)) fail(`${at}: missing asset refs`);
    if (!scene.motionSignature || previous?.motionSignature === scene.motionSignature) fail(`${at}: missing or repeated scene motion signature`);
    if (!scene.transition || !['hold','crossfade','shared-object','camera','semantic-cut'].includes(scene.transition.type) || !Number.isInteger(scene.transition.durationMs) || scene.transition.durationMs < 0 || scene.transition.durationMs > 2000) fail(`${at}: invalid transition`);
    if (previous && scene.transition?.durationMs === 0 && scene.transition.type !== 'semantic-cut') fail(`${at}: unplanned hard cut`);
    if (scene.transition?.type === 'semantic-cut' && !scene.transition.reason) fail(`${at}: semantic cut needs reason`);
    const m = scene.motionContract;
    if (!m || !['dom-svg','canvas','webgl','hybrid'].includes(m.renderer)) { fail(`${at}: missing motion contract/renderer`); continue; }
    const objects = new Set();
    for (const obj of m.objects ?? []) {
      if (!obj.id || !obj.role || !obj.continuity || objects.has(obj.id)) fail(`${at}: invalid/duplicate persistent object`);
      objects.add(obj.id);
    }
    if (!objects.size) fail(`${at}: no persistent objects`);
    let end = scene.startMs, signature;
    for (const beat of m.beats ?? []) {
      if (!Number.isInteger(beat.startMs) || !Number.isInteger(beat.endMs) || beat.startMs !== end || beat.endMs <= beat.startMs) fail(`${at}: invalid beat coverage`);
      if (![beat.meaning,beat.before,beat.action,beat.after,beat.signature].every(v=>typeof v==='string' && v.trim())) fail(`${at}: incomplete before/action/after`);
      if (signature === beat.signature) fail(`${at}: repeated adjacent beat signature`);
      if (!beat.objectIds?.length || beat.objectIds.some(id=>!objects.has(id))) fail(`${at}: unresolved beat objects`);
      if (!beat.cueIndexes?.length || beat.cueIndexes.some(index=>!board.captions?.some(c=>c.index===index && c.startMs<beat.endMs && c.endMs>beat.startMs))) fail(`${at}: beat missing alignment evidence`);
      end = beat.endMs; signature = beat.signature;
    }
    if (end !== scene.endMs) fail(`${at}: beats do not cover scene`);
    if (!m.probes?.length || !m.reviewQuestions?.length || !scene.layoutBoxes) fail(`${at}: missing probes, review questions or layout boxes`);
    for (const probe of m.probes ?? []) {
      if (!Number.isInteger(probe.atMs) || probe.atMs<scene.startMs || probe.atMs>=scene.endMs || !probe.assertions?.length) fail(`${at}: invalid probe time/assertions`);
      for (const assertion of probe.assertions ?? []) {
        if (assertion.changeFromMs !== undefined && (!Number.isInteger(assertion.changeFromMs) || assertion.changeFromMs<scene.startMs || assertion.changeFromMs>=probe.atMs)) fail(`${at}: invalid movement baseline`);
        const refs=[assertion.left, ...(typeof assertion.right==='object' ? [assertion.right] : [])];
        if (refs.some(ref=>!objects.has(ref?.objectId) || !['x','y','width','height','opacity'].includes(ref?.property))) fail(`${at}: invalid geometry reference`);
        if (!['gt','gte','lt','lte','eq'].includes(assertion.op) || (typeof assertion.right!=='object' && !Number.isFinite(assertion.right))) fail(`${at}: invalid geometry assertion`);
      }
    }
    previous=scene;
  }
  let captionEnd = board.scenes[0]?.startMs;
  for (const cue of board.captions ?? []) {
    if (!Number.isInteger(cue.startMs) || !Number.isInteger(cue.endMs) || cue.startMs!==captionEnd || cue.endMs<=cue.startMs || !board.textManifest[cue.textRef]) fail('Invalid caption coverage/reference');
    captionEnd=cue.endMs;
  }
  if (captionEnd!==board.scenes.at(-1)?.endMs) fail('Captions do not cover full storyboard');
  return errors;
}

export function sampleMotionTimes(scene, captions, intervalMs = 250) {
  const times = new Set([0,scene.endMs-scene.startMs-1]);
  const add = t => times.add(Math.max(0,Math.min(scene.endMs-scene.startMs-1, Math.round(t-scene.startMs))));
  for (let t=scene.startMs;t<scene.endMs;t+=intervalMs) add(t);
  for (const beat of scene.motionContract.beats) { add(beat.startMs); add((beat.startMs+beat.endMs)/2); add(beat.endMs-1); }
  for (const cue of captions) { if(cue.endMs>scene.startMs&&cue.startMs<scene.endMs) { add(cue.startMs); add(cue.endMs-1); } }
  for (const probe of scene.motionContract.probes) add(probe.atMs);
  for (const probe of scene.motionContract.probes) for (const assertion of probe.assertions) if(assertion.changeFromMs!==undefined) add(assertion.changeFromMs);
  return [...times].sort((a,b)=>a-b);
}

// Runs in the browser. Read computed geometry, never an animation's claimed state.
export function inspectMotionFrame({textManifest, layoutBoxes}) {
  const opacity = element => {
    let value=1;
    for(let p=element;p instanceof Element;p=p.parentElement) {
      const s=getComputedStyle(p);
      if(s.display==='none'||s.visibility==='hidden') return 0;
      value *= Number(s.opacity);
    }
    return value;
  };
  const box = element => { const r=element.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,opacity:opacity(element)}; };
  const normalize = s=>s.replace(/\s+/g,'');
  const errors=[], texts=[];
  for(const el of document.querySelectorAll('[data-text-ref]')) {
    const r=box(el); if(r.opacity<=.05 || !r.width || !r.height) continue;
    const ref=el.dataset.textRef, value=normalize(el.textContent);
    if(!textManifest[ref] || normalize(textManifest[ref].value)!==value) errors.push({kind:'text-source',ref,value});
    const region=el.closest('[data-layout-box]')?.dataset.layoutBox, allowed=layoutBoxes[region];
    if(!allowed) errors.push({kind:'missing-layout-box',ref});
    else if(r.x<allowed.x-1||r.y<allowed.y-1||r.x+r.width>allowed.x+allowed.width+1||r.y+r.height>allowed.y+allowed.height+1) errors.push({kind:'text-outside-layout',ref,box:r,region});
    texts.push({ref,value,...r});
  }
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())) {
    const p=node.parentElement;
    if(!node.textContent.trim() || p.closest('script,style') || opacity(p)<=.05) continue;
    if(!p.closest('[data-text-ref]')) errors.push({kind:'unreferenced-text',value:node.textContent.trim()});
  }
  for(let i=0;i<texts.length;i++) for(let j=i+1;j<texts.length;j++) {
    const a=texts[i],b=texts[j];
    const w=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
    const h=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
    if(w>2&&h>2) errors.push({kind:'text-overlap',refs:[a.ref,b.ref],intersection:{width:w,height:h}});
  }
  const objects={};
  for(const el of document.querySelectorAll('[data-object-id]')) {
    const id=el.dataset.objectId;
    if(objects[id]) errors.push({kind:'duplicate-object',objectId:id});
    objects[id]=box(el);
  }
  return {texts,objects,errors,viewport:{width:innerWidth,height:innerHeight},document:{width:document.body.scrollWidth,height:document.body.scrollHeight}};
}

export function checkGeometryProbes(scene, atMs, frame, framesByTime = new Map()) {
  const errors=[];
  const read=ref=>frame.objects[ref.objectId]?.[ref.property];
  for(const probe of scene.motionContract.probes.filter(p=>p.atMs===atMs)) for(const a of probe.assertions) {
    let left=read(a.left);
    if(a.changeFromMs!==undefined) left-=framesByTime.get(a.changeFromMs)?.objects[a.left.objectId]?.[a.left.property];
    const right=typeof a.right==='object'?read(a.right):a.right;
    const compare={gt:()=>left>right,gte:()=>left>=right,lt:()=>left<right,lte:()=>left<=right,eq:()=>Math.abs(left-right)<(a.tolerance??1)};
    if(!Number.isFinite(left)||!Number.isFinite(right)||!compare[a.op]?.()) errors.push({kind:'relationship-not-implemented',meaning:probe.meaning,assertion:a,observed:{left,right}});
  }
  return errors;
}
