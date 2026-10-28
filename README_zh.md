# TextVideoGen

[English](README.md) | 简体中文


由 OpenCode 驱动的本地视频生产工作区。用户提供文稿、传播目的和业务限制，Agent 负责创意提案、导演、分镜、素材、制作、检查和返修，让观众第一次观看就能理解内容。

支持按场景选择 HTML/SVG 动画、图片、混合画面与 B-roll；语音使用 Voicebox，时间对齐使用 WhisperX，HTML 渲染使用 Playwright 和 FFmpeg。代码、视频项目与运行环境分开保存。

## 当前实现

工作流由 OpenCode、Agent 角色与 Skills 协同执行。`bin/` 提供安装、启动、建项目、日志、交付和打包入口，`scripts/lib/` 提供共享渲染、合成与运动检查工具。`src/pipeline/` 目前是接口骨架，尚未实现独立的一键生产 API；`pnpm pipeline` 仅提示使用 OpenCode。

本次整理已清除历史生成产物。旧项目仅保留原始文稿、草稿状态和清理日志，重新制作应从 script 阶段开始。发布包只包含工作区代码和公共素材，`projects/` 仅保留占位文件。

## 快速开始

### 1. 准备系统

当前安装脚本支持 **macOS Apple Silicon（arm64）**。系统需具备 `zsh`、`curl`、`tar`、`shasum`，并预先安装 OpenCode 和 Voicebox。

- OpenCode 默认路径：`/opt/homebrew/bin/opencode`，可通过 `OPENCODE_BIN` 指定。
- Voicebox 默认路径：`/Applications/Voicebox.app/Contents/MacOS/voicebox-server`，可通过 `VOICEBOX_BIN` 指定。
- 首次安装需要联网下载运行时、依赖、浏览器和模型，并预留足够磁盘空间；当前本地环境约 16 GB，实际大小随模型与缓存变化。

### 2. 恢复隔离环境

在完整源码目录中运行：

```bash
./bin/setup
./bin/check-environment
```

安装脚本将 Node、pnpm、Python、uv、WhisperX、Chromium、FFmpeg 和 Voicebox 模型放入 `.videoenv/`。固定版本见 [config/runtime.lock.json](config/runtime.lock.json)、`pnpm-lock.yaml` 和 `uv.lock`。只检查已有环境可运行 `./bin/setup --check`。

暂缓下载 Voicebox 模型：

```bash
./bin/setup --skip-voicebox-model
```

之后再次执行 `./bin/setup` 补齐。WhisperX 模型在首次对齐时按实际语言和模型下载。若清空运行环境，保留 `.videoenv/activate` 与 `.videoenv/README.md`，再执行安装；这两个文件是恢复所需的源码。

### 3. 配置服务与路径

通过工作区启动器完成 OpenCode provider 登录；当前版本的命令选项可查看：

```bash
./bin/opencode-video providers --help
```

凭证、会话、模型、参考音频和 Voicebox 数据只留在 `.videoenv/`，发布包不会带出。启动器会先确保 Voicebox 就绪；真实语音合成还需要用户提供参考音频并建立语音 profile。

默认 GPT 负责创意、导演、返修范围与最终门禁，DeepSeek 负责整理、元数据和初检。模型配置见 `opencode.jsonc`、`video.config.yaml` 及 `.opencode/agents/`；调整时应保持一致，DeepSeek 的结果必须复核。

在其他电脑使用前，修改默认交付路径 `<user-home>/Movies/VideoTextGen`：

1. 更新 `video.config.yaml` 中的最终输出目录与输出布局。
2. 更新 `opencode.jsonc` 中允许访问的外部交付目录，以及 `AGENTS.md` 中的工作区边界。
3. 调用交付命令时设置 `VIDEOTEXTGEN_FINALS_DIR` 为同一目录；不设置时仍使用上述默认路径。

Voicebox 默认端口为 `17493`；若通过 `VOICEBOX_PORT` 改用其他端口，需同步更新 `opencode.jsonc` 与 `video.config.yaml` 中的连接地址。

### 4. 创建视频项目

```bash
./bin/new-project my-video "视频标题"
./bin/opencode-video
```

项目 ID 使用 2–64 个小写字母、数字或连字符，以字母或数字开头。将原始文稿和必用素材放在 `projects/my-video/source/`，然后在 OpenCode 中说明项目 ID、内容、受众、平台和硬性限制。

未指定视觉形式时，Agent 会提出 2–3 套可制作的创意方案并推荐其一；用户不选择或交由 Agent 决定时采用推荐方案。生产顺序为：

```text
script → voice → alignment → creative-treatment → director → storyboard
       → assets → render → compose → qa → review → revision → deliver
```

## 目录结构

| 目录 / 文件 | 用途 |
| --- | --- |
| `bin/` | 安装、启动、检查、日志、交付和打包命令 |
| `scripts/` | 项目管理、环境检查、共享渲染 / 合成 / QA 实现 |
| `src/` | TypeScript provider 契约与 pipeline 接口骨架 |
| `config/`、`video.config.yaml` | 固定运行版本、provider 与生产策略 |
| `schemas/`、`prompts/` | 项目、分镜、运动、返修等结构化契约与提示词 |
| `.agents/skills/` | video-pipeline、Jacky 插画、SRT HTML Motion Skills |
| `.opencode/agents/`、`opencode.jsonc` | Agent 职责、模型路由、插件和权限 |
| `assets/` | 公共字体、品牌、音乐、音效与 B-roll |
| `vendor/` | 固定的第三方图片生成插件源码及许可证 |
| `projects/<id>/` | 单个视频的输入、计划、场景、状态、QA 和交付记录 |
| `.videoenv/` | 本地运行时、模型、依赖、缓存、凭证与日志 |

新项目使用 `source/`、`plan/`、`scenes/`、`work/`、`qa/`、`logs/`、`deliveries/` 结构。每个场景的可变素材存放在 `scenes/<sceneId>/assets/`，每次渲染使用独立的 `work/renders/<runId>/`，不覆盖历史输出。

## 制作与检查

- 先保证信息清楚、音画同步和节奏自然，再考虑视觉吸引力与生成成本。
- 根据场景语义选择 `html`、`image`、`hybrid` 或 `broll`；混合场景先登记图片，再由 HTML 引用并承担解释层。
- 屏幕文字必须来自文稿、SRT、用户文案或获批创意方案，并通过 `textRefs` 追溯来源。
- 连续动画围绕内容关系设计；避免重复入场和未经规划的硬切，保留稳定的最终画面。
- QA 检查文字、布局、图片引用、对象关系、运动重复、同步与风格；最终 review 通过后才交付。
- 返修先记录影响范围，只重算受影响阶段；语音或时长变化必须重新对齐。

运动检查示例：

```bash
./bin/pnpm-video motion:content-check \
  projects/my-video/plan/storyboard-v1.json \
  projects/my-video/scenes/scene-001/assets/motion-v1.html \
  projects/my-video/qa/content-check-v1.json
```

共享 HTML renderer 默认 30 fps，快速运动可选择 60 fps。帧直接送入 FFmpeg，默认并发两个 scene；可用 `VTX_RENDER_CONCURRENCY=1` 降低负载，调试时使用 `--keep-frames`。合成工具在一个 FFmpeg filter graph 中完成重定时和拼接。详细制作要求见 [docs/semantic-motion.md](docs/semantic-motion.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `./bin/check-environment` | 检查运行时、Python imports、浏览器与媒体工具，不进行模型推理 |
| `./bin/voicebox-video start` / `status` / `stop` / `logs` | 管理工作区 Voicebox 服务 |
| `./bin/pnpm-video typecheck` | TypeScript 类型检查 |
| `./bin/pnpm-video test:motion` | 现有运动检查测试 |
| `./bin/pnpm-video check` | 类型、隔离环境和 Voicebox 检查 |
| `./bin/whisperx <audio-file> --device cpu --compute_type int8` | 通过隔离环境执行对齐 |
| `./bin/package-workspace` | 生成不含私有项目与运行环境的源码包 |

生产事件通过入口记录：

```bash
./bin/video-log my-video render started "开始渲染 run-001"
./bin/video-log my-video render completed "场景渲染完成"
```

项目事件写入 `projects/<id>/logs/events.jsonl`；大型调试、OpenCode 和 Voicebox 日志写入 `.videoenv/logs/`。

最终 review 通过、项目状态为 `approved` 后交付：

```bash
./bin/deliver-video my-video projects/my-video/work/renders/run-001/candidate.mp4 v1
```

命令拒绝覆盖已有版本，将 MP4 移动至配置的 Movies 目录，并写入目标路径、文件大小和 SHA-256 交付记录。获批前的候选留在项目内。

## 打包与保持整洁

生成源码发布包：

```bash
./bin/package-workspace
```

命令输出压缩包绝对路径，文件与 SHA-256 校验文件保存到 `.videoenv/tmp/packages/release-<时间>-<随机值>/`，每次生成独立目录。打包只需系统 `zsh`、`tar`、`shasum`，无需先安装运行环境。

包内包含当前代码、配置、lockfiles、公共素材、Skills / 插件实际源码及其许可证，以及 `.videoenv/` 中的两份恢复文件。排除 Git 元数据、依赖、模型、缓存、运行日志、凭证文件、旧视频项目和原始文稿；包内 `projects/` 仅保留占位文件。

解压到新目录后安装：

```bash
mkdir VideoTextGen
tar -xzf /path/to/VideoTextGen.tar.gz -C VideoTextGen
cd VideoTextGen
./bin/setup
```

Skills 和插件以普通源码目录纳入仓库，克隆时无需初始化子模块。也可使用上述源码包迁移；打包器包含当前实际文件及尚未提交的本地修改。

日常把所有项目产物留在各自 `projects/<id>/`，运行日志和临时文件留在 `.videoenv/`。`.gitignore` 排除环境、依赖、大体积音视频、渲染目录、Python 缓存和会话临时文件；项目内 JSON、HTML、图片与事件日志仍可按需要提交。Git 忽略规则不等于发布包规则，分享工作区请使用打包入口。

工作区行为约束见 [AGENTS.md](AGENTS.md)，隔离环境说明见 [docs/environment.md](docs/environment.md)，生产 SOP 见 [.agents/skills/video-pipeline/SKILL.md](.agents/skills/video-pipeline/SKILL.md)。
