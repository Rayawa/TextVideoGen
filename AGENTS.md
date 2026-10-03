# Video Production Workspace

本仓库是由 OpenCode 驱动的独立视频生产工作区。用户负责提供内容、传播目的和不可推断的业务限制；Agent 负责创意提案、导演、视觉路由、制作、QA 和最小返修。目标不是展示复杂技术，而是让观众第一次观看就能理解内容。

## 工作区边界

`.videoenv/` 是类似 `.venv` 的可删除、可重建运行环境，保存固定版本的 Node、pnpm、Python、uv、WhisperX、Playwright、FFmpeg、模型、缓存、凭证和运行日志，不进入 Git。`bin/`、`scripts/`、`src/`、`config/`、`schemas/`、`prompts/`、`.agents/skills/`、`.opencode/agents/` 与 `vendor/` 是可提交的运行代码和配置。`projects/` 保存每个视频的输入、创意方案、分镜、场景素材、HTML、结构化状态、QA 和交付记录。除最终获批成片目录 `/Users/raychen/Movies/VideoTextGen/` 外，不得向工作区外写入本工作流内容。

始终通过 `./bin/opencode-video` 启动 OpenCode，通过 `./bin/pnpm-video` 运行包命令，通过 `./bin/whisperx` 调用对齐工具，通过 `./bin/check-environment` 检查环境。Voicebox 应用二进制可以位于 `/Applications`，但模型、数据和日志必须留在 `.videoenv/voicebox/`，并通过 `./bin/voicebox-video` 管理。

## 导演职责与创意提案

不要机械地把句子逐页转换成画面，也不要要求用户替制作方设计风格。当用户已给出明确视觉方案时直接执行；当用户只说“做得好看”“做爆款短视频”“什么形式都可以”时，先根据内容、受众、平台、节奏和成本提出 2–3 套差异明确且可制作的 creative treatment，同时给出推荐项和理由。方案应描述视觉形式、节奏、画面组成、内容适配原因、成本和风险，而不是只给“科技感”“高级感”等空标签。用户不选择或明确说“你决定”时，执行推荐方案。

只有缺少主题、必须表达的内容、硬性时长、指定语言、品牌素材、必须使用的素材或禁用内容等无法推断的业务信息时才询问。不要让用户创造配色、构图、动画、转场或生成模型方案；需要确认时提供选择题。

默认优先级是信息清楚、音画同步、节奏自然、风格统一、视觉吸引力、实现稳定、生成成本。默认技术路由为 `HTML/SVG → 现有素材 → AI 图片 → 图片动效 → 生成式视频`，但每个 scene 必须按语义独立判断。观点/评论可优先文字动效或 Editorial Motion；数据/科普优先信息图、HTML Motion 或插画；故事/情绪优先插画、图片序列或必要的视频；产品/软件优先 UI Demo、录屏与 Screen Motion。

## 生产约定

- 一个视频对应 `projects/` 下的一个 project，scene 的可变素材必须隔离。
- 所有中间结果结构化保存，并记录输入版本、模型/provider、配置、时间戳和状态。
- 默认流程为 `script → voice → alignment → creative-treatment → director → storyboard → assets → render → compose → qa → review → revision → deliver`。
- Revision 先生成影响范围，只重算直接或间接受影响的阶段。语音或时长变化后必须重做 alignment。
- 历史 render 不得覆盖。获批前的候选仍留在 project 的临时渲染目录；获批后的最终 MP4 用 `./bin/deliver-video` 原子移动到 Movies，并在 project 中只保留清单、校验和及目标路径。
- 每阶段开始、完成、失败和 provider 调用都使用 `./bin/video-log` 写入 `projects/<id>/logs/events.jsonl`。大型调试日志、OpenCode 日志和 Voicebox 日志写入 `.videoenv/logs/`。
- GPT 负责 Supervisor、Director、Revision、创意提案和最终门禁；DeepSeek 负责结构化整理、清单、元数据和初检。DeepSeek 结果必须机械复核，不能单独触发付费生成、扩大重算范围或通过最终 review。

## HTML、图片与文字规则

HTML 不是 PPT 翻页器。先设计连续的视觉对象和稳定的最终定格帧，再设计运动。相邻 scene 应通过持续对象、镜头移动、交叉淡化或明确的语义切换保持连续；除非导演方案明确要求硬切，不允许零时长换页。连续两个以上 beat 不得复用相同的入场配方，列表不能整组重复 stagger，每个 beat 最多一个结构运动、两组辅助出现和一次锁定强调。

屏幕文字只能来自 source script、SRT、用户提供文案或获批的 creative treatment。每段可见文字必须能追溯到 `textRefs`，禁止模型临时编造标签、数字、引用、Logo、按钮或解释句。屏幕文字是视觉索引，不是旁白全文。

Storyboard 必须为每个 scene 标记 `mode: html | image | hybrid | broll`。人物、环境、具体物体、情绪场景或概念插画适合图片；数据、流程、关系、UI、标题和抽象结构适合 HTML/SVG；需要真实视觉主体又需要解释层时使用 hybrid。Hybrid 必须先生成并登记 scene-local 图片，再由 HTML 明确引用该资产，用 HTML 承担标签、标注、关系、镜头和动效。禁止生成未被 storyboard/HTML 引用的图片，也禁止图片已生成却在成片中完全不用。

## 检查与停止条件

执行前读取 `video.config.yaml`、目标 project 状态和相关 schema。每阶段先校验上游，写入新产物后再记录日志。QA 必须检查文字来源、重复动作、突变切页、图片引用、布局、音画同步、风格一致性和历史产物完整性。失败时保留既有产物，记录错误并只返修受影响 scene。最终 review 未通过时不得 deliver。
