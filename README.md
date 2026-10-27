# TextVideoGen

English | [简体中文](README_zh.md)

A local OpenCode workspace for scene-based video production, alignment, rendering and review.

## Overview

The workflow coordinates script, voice, alignment, visual treatment, storyboard, assets, rendering, composition and review. Scenes may use HTML/SVG, images, mixed compositions or B-roll. Commands and agent workflows implement the production process; `src/pipeline/` remains an interface skeleton rather than an independent one-command production API.

## Technology and Dependencies

The setup script supports macOS Apple Silicon. OpenCode and Voicebox must already be installed. The isolated environment provisions pinned Node/pnpm, Python/uv, WhisperX, Chromium, Playwright, FFmpeg and models. Lock files specify dependency versions; service credentials are configured locally.

## Repository Structure

- `bin/` — supported command wrappers
- `scripts/` — setup, rendering and QA tools
- `src/` — pipeline interfaces and runtime code
- `config/` — runtime locks and configuration
- `schemas/` — structured project contracts
- `prompts/` — production prompts
- `projects/` — per-video workspaces
- `.videoenv/` — local runtime environment

## Quick Start

From the full source checkout:

```bash
./bin/setup
./bin/check-environment
./bin/opencode-video
```

The initial setup downloads runtimes, browser dependencies and models. Use `./bin/setup --skip-voicebox-model` to defer that model download, then rerun setup later. Use the command wrappers for package and media tools; keep generated work within its project. Final delivery follows the review gate described in [AGENTS.md](AGENTS.md).
