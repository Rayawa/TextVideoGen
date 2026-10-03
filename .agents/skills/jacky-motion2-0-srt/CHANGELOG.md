# Changelog

## 2.1.0 - 2026-07-20

- Upgraded the skill to the independent Jacky Motion 2.0 SRT automatic-recording workflow.
- Added SRT parsing and made subtitle timestamps the single source of truth for beat and step timing.
- Added a fourth confirmation gate for locking motion, step, and B-roll coverage before HTML assembly.
- Added automatic fullscreen startup, a three-second countdown, pause/resume, five-second seeking, and deterministic replay.
- Added first-class B-roll beats with titled recording frames for intervals that should show real product footage.
- Extended static and browser validation for time coverage, overlaps, gaps, and autoplay state.
- Fixed stretched `paper-collage` kicker labels by making them hug their text content inside Grid and Flex layouts.

## 2.0.0 - 2026-07-14

- Rebuilt Jacky Motion around the 2.1 Hybrid architecture while keeping the public display name at 2.0.
- Replaced per-style HTML templates with a fixed runtime base and injectable style layers.
- Changed the workflow to 5 phases with confirmation gates after script audit, storyboard, and style selection.
- Expanded the default style set from 4 to 6 with paper collage and sketch note.
- Added registered layout skeletons, information primitives, beat contracts, and final-state quality gates.
- Added static HTML validation and optional Playwright layout checks.
- Removed TTS, audio, and voice handling from the default workflow.

## 0.1.1 - 2026-05-20

- Clarified installation and invocation docs across different agent hosts.
- Added screenshot rendering rules to preserve readable UI screenshots without cropping.
- Updated quality checks and Apple-tech style constraints for information screenshots.

## 0.1.0 - 2026-05-20

- Initial standalone release of Jacky-motion.
- Added 6-stage Chinese voiceover-to-motion-HTML workflow.
- Added 4 built-in styles and HTML templates.
- Added installation, design, workflow, and style documentation.
