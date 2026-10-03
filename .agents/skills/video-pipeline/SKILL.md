---
name: video-pipeline
description: Orchestrate one structured video project from source through creative proposals, scene routing, production, QA, revision, and external final delivery.
---

# Video Pipeline

Use this skill as the supervisor SOP for one project under `projects/`. Read `AGENTS.md`, `video.config.yaml`, the project state, and applicable schemas before acting.

## Start and log

Create projects with `./bin/new-project <id> <title>`. At every stage boundary run `./bin/video-log <id> <stage> <status> [message]`; allowed statuses are `started`, `completed`, `failed`, `provider-called`, `review-decision`, `delivered`, and `info`. Keep concise structured audit events in the project and large raw logs in `.videoenv/logs/`.

## Creative proposal gate

If the user already gave a production-ready visual direction, record it and continue. Otherwise produce 2–3 concrete creative treatments based on the source, audience, platform, information density, rhythm, cost, and risk. Each treatment states visual form, pacing, major scene language, why it fits, expected cost, and limitations. Recommend exactly one. If the user says “you decide” or does not choose, select the recommendation; ask only for business constraints that cannot be inferred.

## Production order

1. Version the source and normalize the narration.
2. Generate voice through Voicebox and align the resulting audio; timing comes from alignment, never character-count guesses.
3. Save the selected creative treatment and director plan.
4. Build a storyboard conforming to `schemas/storyboard.schema.json`. Every scene chooses `html`, `image`, `hybrid`, or `broll`, declares exact `textRefs`, asset requirements, a distinct motion signature, continuity, and transitions.
5. Generate only storyboard-requested assets. Store generated images under `projects/<id>/scenes/<sceneId>/assets/` and update the scene asset manifest before HTML work.
6. For `hybrid`, HTML must consume the generated image and add only explanatory overlays, masks, camera motion, labels, arrows, or data. A generated image with no downstream reference is a failure.
7. Render scenes into a new run directory, compose a candidate, then run QA. Never replace historical renders.
8. Stop at final review. On revision, record an impact plan and recompute only affected stages. Any voice-duration change invalidates alignment and timing descendants.
9. After the project is explicitly marked `approved`, deliver with `./bin/deliver-video`. The command moves the final MP4 to `/Users/raychen/Movies/VideoTextGen/` and retains only a manifest in the project.

## Required QA evidence

New productions use the `semantic-motion` profile in `docs/semantic-motion.md`, `prompts/director.md` and `prompts/motion-production.md`. Require an implemented before/action/after relationship for each beat, shared object identity across continuous shots, actual >=30 fps rendering and intermediate-frame layout evidence. Run the semantic-motion checker before render. Do not use the legacy SRT fixed-layout template as the universal route. Verify visual/semantic craft from frames and the candidate; the mechanical checker alone cannot pass final review.

QA checks source fidelity, text-reference integrity, unused generated images, missing hybrid assets, repeated adjacent motion signatures, unplanned hard cuts, stable final frames, layout, timing, audio continuity, provenance, and output completeness. A first-pass DeepSeek QA may collect evidence, but GPT performs semantic/creative review and the final gate.

## Provider boundary

Use only project-local Skills and configured providers. Do not add dependencies, download different models, or connect new providers without explicit approval. Preserve `.videoenv/` isolation and do not write outside the workspace except through the approved final-delivery command.
