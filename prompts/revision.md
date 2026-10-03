# Revision Prompt

Inputs: user feedback, current project state, artifact provenance, storyboard, timeline, QA findings, and render history.

Return a revision plan compatible with `schemas/revision.schema.json`. Identify exact targets, dependency-driven invalidations, reusable artifacts, and the earliest necessary recompute stage. Treat invented HTML text, repeated adjacent motion signatures, unplanned hard cuts, missing/unused image assets, and invisible hybrid assets as scene-local defects unless they reveal a storyboard-wide routing problem. Any voice or duration change must invalidate alignment. Never overwrite an earlier render.
