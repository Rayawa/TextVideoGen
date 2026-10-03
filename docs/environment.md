# Isolated project environment

Run OpenCode only through:

```bash
./bin/opencode-video
```

Or activate the environment in the current shell:

```bash
source .videoenv/activate
```

The launcher does not replace `HOME`. It places the pinned Node runtime, pnpm, managed Python, Python virtual environment, uv, XDG state, package-manager caches, Hugging Face downloads, Playwright browsers, FFmpeg/FFprobe links, logs, and temporary files inside `.videoenv/`. Run `./bin/setup` after cloning to rebuild this directory.

Installed JavaScript dependency trees live under `.videoenv/deps/`. The `node_modules` entries beside the source are ignored symbolic links only, so runtime payloads stay separate from tracked code.

OpenCode authentication performed from this launcher is isolated from the user's global OpenCode configuration. Do not run package managers or model downloaders outside the activated environment for this project.

The project credential file is `.videoenv/xdg/data/opencode/auth.json` with mode `0600`. It currently contains the project-local OpenAI OAuth and DeepSeek API credentials and is ignored by Git.

The Voicebox model cache and backend state are isolated under `.videoenv/voicebox/`. Launch the backend through `./bin/voicebox-video`; opening the desktop application directly from Finder will not inherit the project model path.

## Installed runtime commands

```bash
./bin/check-environment
./bin/voicebox-video start
./bin/voicebox-video status
./bin/voicebox-video stop
./bin/pnpm-video <command>
./bin/whisperx <audio-file> --device cpu --compute_type int8
```

WhisperX model and alignment-model downloads are deferred until the first real alignment job because they depend on the selected model and detected language. Their caches are already confined to `.videoenv/`.

## Model routing

- `openai/gpt-5.6-sol`: supervisor, creative direction, revision impact, generation decisions, and final review gates.
- `deepseek/deepseek-v4-flash`: deterministic extraction, schema formatting, inventories, metadata, and first-pass QA.
- DeepSeek output is verified by the supervisor before it can trigger paid generation, invalidate artifacts, or pass review.

Voicebox is installed and connected, but a real synthesis job additionally requires a voice profile with a user-provided reference sample. Profiles and generated audio are stored under `.videoenv/voicebox/data/`.
