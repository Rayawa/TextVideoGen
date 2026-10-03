# Semantic motion production

Read the selected treatment, storyboard, exact alignment and `docs/semantic-motion.md` before making assets. A scene is a continuous shot; its beats share objects and one clock. Keep scene-local assets isolated but reuse object identity within the shot.

Implement each beat's before/action/after relationship explicitly. Use a bespoke structure-changing motion for that relationship. Generic fade/slide/stagger is permitted only as secondary appearance. One structural action, at most two auxiliary appearance groups and one emphasis per beat. Do not run every reveal through a common sequence.

Expose `window.renderAt(ms)` as a deterministic seek function, `window.__SCENE_READY__` after fonts/assets load, and stable `[data-object-id]` elements. Put every on-screen text node under its exact `[data-text-ref]`; use storyboard textManifest values, including each active caption. Mark text regions with `[data-layout-box]`; give their allowed rectangle in storyboard `layoutBoxes`. Animated SVG must put these attributes on the actual text/object whose geometry is checked. Required explanation text stays in platform-safe bounds even while moving.

Use SVG paths/masks/transforms, DOM typography and, when justified, Canvas/WebGL. Canvas text must have a corresponding measurable overlay or explicit audited geometry; inaccessible painted labels cannot silently pass DOM QA. Do not add dependencies/providers or download assets for visual variety. No decorative HUD labels, fake numerals or invented UI. Choose framing and negative space before adding detail.

Render actual new frames at >=30 fps. Use 60 fps for rapid motion when production cost permits. A 15 fps source duplicated into a 30 fps export fails this profile. Preserve a stable final hold. Use the same clock for preview and export. Scene transitions must be rendered within the continuous shot or by an explicitly implemented compositor; plain concat does not implement a promised crossfade/morph.

Run `motion:content-check` before render. Capture beginnings, structural-motion midpoints, caption boundaries, relation probes, transitions, densest frames and the final hold. Check visible text, source references, safe bounds, pairwise text overlaps, deterministic seek and actual object relations. Then visually review frame evidence and the candidate: geometry assertions do not certify meaning, craft or smoothness. Repair affected assets and render a new run only; never overwrite the old run.
