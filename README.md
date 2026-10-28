# TextVideoGen

English | [简体中文](README_zh.md)


A local video production workspace driven by OpenCode. Users provide a script, communication goals, and business constraints; agents handle creative proposals, direction, storyboards, assets, production, checks, and revisions so viewers can understand the content on first viewing.

Scenes can use HTML/SVG animation, images, hybrid visuals, or B-roll. Voicebox provides speech, WhisperX aligns timing, and Playwright with FFmpeg renders HTML. Code, video projects, and the runtime environment are stored separately.

## Current implementation

OpenCode, agent roles, and Skills execute the workflow together. `bin/` provides entry points for installation, startup, project creation, logs, delivery, and packaging; `scripts/lib/` provides shared rendering, composition, and motion checking tools. `src/pipeline/` is currently an interface skeleton without a standalone one-command production API; `pnpm pipeline` only directs users to OpenCode.

This cleanup removed historical generated outputs. Older projects retain only original scripts, draft states, and cleanup logs; reproduction should restart at the script stage. Release packages contain only workspace code and shared assets, with placeholder files only in `projects/`.

## Quick start

### 1. Prepare the system

The current setup script supports **macOS Apple Silicon (arm64)**. The system needs `zsh`, `curl`, `tar`, and `shasum`, with OpenCode and Voicebox installed beforehand.

- Default OpenCode path: `/opt/homebrew/bin/opencode`; override it with `OPENCODE_BIN`.
- Default Voicebox path: `/Applications/Voicebox.app/Contents/MacOS/voicebox-server`; override it with `VOICEBOX_BIN`.
- Initial installation requires internet access to download runtimes, dependencies, browsers, and models, plus sufficient disk space. The current local environment is about 16 GB; actual size varies with models and caches.

### 2. Restore the isolated environment

Run from the complete source directory:

```bash
./bin/setup
./bin/check-environment
```

The setup script places Node, pnpm, Python, uv, WhisperX, Chromium, FFmpeg, and Voicebox models in `.videoenv/`. Pinned versions are in [config/runtime.lock.json](config/runtime.lock.json), `pnpm-lock.yaml`, and `uv.lock`. Run `./bin/setup --check` to check an existing environment only.

To defer downloading Voicebox models:

```bash
./bin/setup --skip-voicebox-model
```

Run `./bin/setup` again later to complete installation. WhisperX downloads models during the first alignment according to the actual language and model. When clearing the runtime environment, retain `.videoenv/activate` and `.videoenv/README.md`, then run setup again; these two source files are required for recovery.

### 3. Configure services and paths

Log in to the OpenCode provider through the workspace launcher. To see command options for the current version:

```bash
./bin/opencode-video providers --help
```

Credentials, sessions, models, reference audio, and Voicebox data stay in `.videoenv/` and are excluded from release packages. The launcher first ensures Voicebox is ready; actual speech synthesis also requires user-provided reference audio and a voice profile.

By default, GPT handles creative work, direction, revision scope, and the final gate; DeepSeek handles organization, metadata, and initial checks. Model configuration is in `opencode.jsonc`, `video.config.yaml`, and `.opencode/agents/`. Keep them consistent when making changes, and review DeepSeek results.

Before using another computer, change the default delivery path `<user-home>/Movies/VideoTextGen`:

1. Update the final output directory and output layout in `video.config.yaml`.
2. Update the permitted external delivery directory in `opencode.jsonc` and the workspace boundaries in `AGENTS.md`.
3. Set `VIDEOTEXTGEN_FINALS_DIR` to the same directory when invoking the delivery command; otherwise, the default path above is used.

Voicebox uses port `17493` by default. If `VOICEBOX_PORT` changes it, also update the connection addresses in `opencode.jsonc` and `video.config.yaml`.

### 4. Create a video project

```bash
./bin/new-project my-video "视频标题"
./bin/opencode-video
```

Project IDs use 2–64 lowercase letters, digits, or hyphens and must begin with a letter or digit. Put the original script and required assets in `projects/my-video/source/`, then specify the project ID, content, audience, platform, and hard constraints in OpenCode.

If no visual format is specified, the agent proposes 2–3 feasible creative approaches and recommends one. The recommendation is used if the user does not choose or delegates the decision to the agent. Production proceeds in this order:

```text
script → voice → alignment → creative-treatment → director → storyboard
       → assets → render → compose → qa → review → revision → deliver
```

## Directory structure

| Directory / file | Purpose |
| --- | --- |
| `bin/` | Installation, startup, checks, logs, delivery, and packaging commands |
| `scripts/` | Project management, environment checks, and shared rendering / composition / QA implementation |
| `src/` | TypeScript provider contracts and pipeline interface skeleton |
| `config/`, `video.config.yaml` | Pinned runtime versions, providers, and production policies |
| `schemas/`, `prompts/` | Structured contracts and prompts for projects, storyboards, motion, revisions, and more |
| `.agents/skills/` | video-pipeline, Jacky illustration, and SRT HTML Motion Skills |
| `.opencode/agents/`, `opencode.jsonc` | Agent responsibilities, model routing, plugins, and permissions |
| `assets/` | Shared fonts, branding, music, sound effects, and B-roll |
| `vendor/` | Pinned third-party image generation plugin source and licenses |
| `projects/<id>/` | Inputs, plans, scenes, state, QA, and delivery records for one video |
| `.videoenv/` | Local runtimes, models, dependencies, caches, credentials, and logs |

New projects use `source/`, `plan/`, `scenes/`, `work/`, `qa/`, `logs/`, and `deliveries/`. Mutable scene assets go in `scenes/<sceneId>/assets/`. Each render uses a separate `work/renders/<runId>/` and does not overwrite historical outputs.

## Production and checks

- Prioritize clear information, audio/video synchronization, and natural pacing before visual appeal and generation cost.
- Choose `html`, `image`, `hybrid`, or `broll` according to scene meaning. For hybrid scenes, register images first, then reference them from HTML, which provides the explanatory layer.
- On-screen text must come from the script, SRT, user copy, or approved creative proposal, with its source traceable through `textRefs`.
- Design continuous animation around content relationships. Avoid repetitive entrances and unplanned hard cuts, and retain a stable final frame.
- QA checks text, layout, image references, object relationships, repeated motion, synchronization, and style. Deliver only after the final review passes.
- Record the scope of a revision first and recompute only affected stages. Changes to speech or duration require realignment.

Motion check example:

```bash
./bin/pnpm-video motion:content-check \
  projects/my-video/plan/storyboard-v1.json \
  projects/my-video/scenes/scene-001/assets/motion-v1.html \
  projects/my-video/qa/content-check-v1.json
```

The shared HTML renderer defaults to 30 fps; 60 fps is available for fast motion. Frames feed directly into FFmpeg, with two scenes processed concurrently by default. Set `VTX_RENDER_CONCURRENCY=1` to reduce load and use `--keep-frames` for debugging. The composition tool performs retiming and concatenation in one FFmpeg filter graph. See [docs/semantic-motion.md](docs/semantic-motion.md) for detailed production requirements.

## Common commands

| Command | Purpose |
| --- | --- |
| `./bin/check-environment` | Check runtimes, Python imports, browsers, and media tools without model inference |
| `./bin/voicebox-video start` / `status` / `stop` / `logs` | Manage the workspace Voicebox service |
| `./bin/pnpm-video typecheck` | TypeScript type checking |
| `./bin/pnpm-video test:motion` | Existing motion check tests |
| `./bin/pnpm-video check` | Check types, the isolated environment, and Voicebox |
| `./bin/whisperx <audio-file> --device cpu --compute_type int8` | Run alignment in the isolated environment |
| `./bin/package-workspace` | Generate a source package without private projects or the runtime environment |

Record production events through the entry point:

```bash
./bin/video-log my-video render started "开始渲染 run-001"
./bin/video-log my-video render completed "场景渲染完成"
```

Project events are written to `projects/<id>/logs/events.jsonl`; large debugging, OpenCode, and Voicebox logs go to `.videoenv/logs/`.

Deliver after the final review passes and the project state is `approved`:

```bash
./bin/deliver-video my-video projects/my-video/work/renders/run-001/candidate.mp4 v1
```

The command refuses to overwrite existing versions, moves the MP4 into the configured Movies directory, and records the target path, file size, and SHA-256. Unapproved candidates stay inside the project.

## Packaging and housekeeping

Generate a source release package:

```bash
./bin/package-workspace
```

The command prints the absolute archive path. The archive and SHA-256 checksum file are saved in `.videoenv/tmp/packages/release-<时间>-<随机值>/`, using a separate directory for each run. Packaging needs only the system `zsh`, `tar`, and `shasum`; runtime installation is unnecessary.

The package includes current code, configuration, lockfiles, shared assets, actual Skills / plugin source and licenses, and the two recovery files in `.videoenv/`. It excludes Git metadata, dependencies, models, caches, runtime logs, credentials, old video projects, and original scripts; `projects/` contains only placeholders.

Extract into a new directory and install:

```bash
mkdir VideoTextGen
tar -xzf /path/to/VideoTextGen.tar.gz -C VideoTextGen
cd VideoTextGen
./bin/setup
```

Skills and plugins are included as ordinary source directories, so cloning requires no submodule initialization. The source package above can also be used for migration; the packager includes actual current files and uncommitted local changes.

Keep project outputs in their respective `projects/<id>/` directories and runtime logs and temporary files in `.videoenv/`. `.gitignore` excludes environments, dependencies, large audio/video files, render directories, Python caches, and session temporary files; project JSON, HTML, images, and event logs may still be committed as needed. Git ignore rules differ from release packaging rules; use the packaging entry point to share the workspace.

See [AGENTS.md](AGENTS.md) for workspace rules, [docs/environment.md](docs/environment.md) for the isolated environment, and [.agents/skills/video-pipeline/SKILL.md](.agents/skills/video-pipeline/SKILL.md) for the production SOP.
