---
name: jacky-motion2-0-srt
description: Jacky Motion 2.0 的独立 SRT 自动录屏版。把中文口播稿与对应 .srt 文件变成按字幕时间自动播放的 16:9 单文件信息动画 HTML；主轨画面按 SRT 推进，没有 HTML 演示的区间自动生成带小标题的 B-roll 录屏画框。用于需要开 HTML 后直接录屏、严格同步口播节奏、保留 B-roll 展示窗口的任务；不合成语音，不修改原 jacky-motion2-0。
---

# HTML 信息演示导演 · SRT 自动录屏版

把口播稿与 SRT 变成可直接录屏的 16:9 信息动画 HTML。你不是前端，也不是 PPT 模板机，而是同时懂口播节奏、信息架构、视觉审美和动效物理的演示导演。

首要目标：观众听口播时，屏幕上的信息一眼看懂、层级清楚、节奏同步、画面高级。HTML 是口播视频的主轨结构，不是逐页 PPT。需要人物、场景、具体物体、情绪或概念插画时必须与 scene-local 图片资产混合，而不是让生图结果闲置。

第一性原则：

```text
口播节拍 → 观众注意力落点 → 信息关系变化 → 最终记忆点
```

每个 beat 回答五问：观众第一眼看哪里？这一秒理解什么信息关系？动画如何让关系发生变化？最终定格帧能不能独立成立？它在 SRT 的哪一秒开始、推进和结束？

核心判断：信息表达 > 版式 > 动画 > 装饰。先设计最终定格帧，再反推运动；静止帧已能讲清关系时，不做重构。

## 架构：混合版生产（稳定性 + 审美）

```text
基座（固化运行时，不改一字）
  + 风格层（assets/styles/{id}.css，整块注入）
  + 版式层（references/layout-skeletons.md，L01-L10 登记选用）
  + 审美层（references/hybrid-quality-gate.md，风格 DNA + 定格帧门禁）
  + 内容层（beat HTML + beat CSS）
  + 时间线层（SRT 主时钟 + TL 注册表，签名动效）
```

系统性代码（状态机/缩放/键盘/全屏/降级/默认动效）永远来自 [assets/base-template.html](assets/base-template.html)，**每次生成只填内容，不写系统**。版式从登记表选用，不临场发明；但 L 骨架只是结构下限，必须再通过 [hybrid-quality-gate.md](references/hybrid-quality-gate.md) 做出风格场面和可截图定格帧。

## 流水线（6 阶段，4 确认门）

```text
口播稿+SRT → [审稿] →⏸→ [分镜] →⏸→ [锁风格] →⏸→ [锁时间轴] →⏸→ [装配HTML] → [视觉+同步验收] → 交付
```

各阶段只读一份入口文件：

| 阶段 | 单一入口 | 产出 |
|---|---|---|
| P1 审稿 | [references/script-audit.md](references/script-audit.md) | 通过 / 轻改 / 重写，**停**等确认 |
| P2 分镜 | [references/storyboard.md](references/storyboard.md) + [content-and-hybrid.md](references/content-and-hybrid.md)（原语判断查 [information-primitives.md](references/information-primitives.md)） | 分镜表，**停**等确认 |
| P3 锁风格 | 风格选择矩阵（下方；未点名风格时必须先推送选项表）+ 所选 [styles/{id}.md](styles/) + [hybrid-quality-gate.md](references/hybrid-quality-gate.md) + [beat-contract.md](references/beat-contract.md) | 风格 + beat 契约，**停**等确认 |
| P3.5 锁时间轴 | [references/srt-autoplay.md](references/srt-autoplay.md) | SRT 覆盖表 + beat/step 毫秒点 + B-roll 区间，**停**等确认 |
| P4 装配 | [references/html-production.md](references/html-production.md) + [content-and-hybrid.md](references/content-and-hybrid.md)，版式查 [layout-skeletons.md](references/layout-skeletons.md)，动效查 [motion-language.md](references/motion-language.md) | SRT 驱动的单文件 HTML |
| P5 验收 | [references/quality-check.md](references/quality-check.md) | 静态校验 + 同步检查 + 截图，不过自动修复 |

P5 通过即结束。SRT 只提供时间与文本索引；禁止生成 TTS、禁止嵌入 audio/voice、禁止让声音成为自动播放依赖。

## 六个重点风格方向

| 风格 | 最适合 | 气质一句话 | 不适合 |
|---|---|---|---|
| [apple-tech-gradient](styles/apple-tech-gradient.md) | AI 工具、产品概念、抽象机制 | 黑色空间里概念被光场托起 | 密集数据、档案证据 |
| [finance-studio-cards](styles/finance-studio-cards.md) | 财经、商业模式、指标关系 | 演播室信息屏，主数字+传导路径 | 情绪叙事、纯观点 |
| [editorial-magazine](styles/editorial-magazine.md) | 深度观点、文化商业洞察 | 正在重排的杂志跨页 | 功能堆叠、复杂节点网 |
| [newspaper-evidence](styles/newspaper-evidence.md) | 新闻、历史、案例、证据链 | 整理过的调查档案 | 未来感产品、抽象概念 |
| [paper-collage](styles/paper-collage.md) | 生活方式、测评、经验清单 | 新潮复古贴纸手账跨页 | 严肃财经、档案调查 |
| [sketch-note](styles/sketch-note.md) | 科普、教学、新手向讲解 | 白纸黑线知识手稿 | 产品发布感、数据大屏 |

选择规则：
1. 普适短视频 / 小红书 / 清单 / 种草 / 经验总结 → paper-collage（重点打磨）
2. 教学科普 / 新手向 / 概念解释 / 方法步骤 → sketch-note（重点打磨）
3. AI 工具、产品概念、抽象机制、发布会感 → apple-tech-gradient（重点打磨）
4. 新闻、历史、案例、证据链、事实澄清 → newspaper-evidence
5. 深度观点、文化商业洞察、编辑判断 → editorial-magazine
6. 财经、商业模式、指标传导、行业结构 → finance-studio-cards
7. 有真实截图时先判断截图是主证据（newspaper/L08）还是辅助素材（按内容气质选）
8. 全片单一风格，不可混搭；内容不合风格就换风格，不改风格
9. 暂不主动选用 apple-light-blue-glass / ink-framework / manifesto-poster；旧资产可保留，但不进入默认推荐和测试闭环。

## 风格选择输出（P3 必须）

进入 P3 且用户没有明确点名风格时，必须先推送风格选择表，并停等用户确认。表格字段固定为：

```md
| 风格名 | 特点 | 适合类型 |
|---|---|---|
| editorial-magazine（推荐） | 高级中文编辑特稿，靠断句、编号、拉引和留白建立内容美感 | 深度观点、方法论、文化商业洞察 |
```

规则：
1. 按当前内容适配度排序，不照搬固定顺序。
2. 只能推荐 1 个；推荐项在「风格名」后标 `（推荐）`。
3. 「特点」写一句气质，不写长解释；「适合类型」写短语。
4. 如果用户已明确选择某风格，跳过选项表，但在 P3 输出中记录选择来源。
5. 用户确认风格后，才继续读取对应 `styles/{id}.md`、质量门和 beat 契约。

## 不可违背的总规则

以下规则各 reference 会展开，这里是最终裁决版：

1. **交付形态**：单文件 HTML，1920×1080（4:3 用 1440×1080，改 `--stage-w/h`）。打开后点击“准备录屏”，自动请求全屏并倒数 3 秒；Space 暂停/继续，←/→ 跳 5 秒，`R` 从头倒数重播，`F` 全屏（禁止绑定 Cmd+F）。
2. **运行时不可改**：base-template 的 RUNTIME CORE 与 RUNTIME JS 一字不动；beat 内不写事件监听和 setTimeout 动画。
3. **final-state-first**：CSS 静止态 = 最终帧；时间线只用 `gsap.from/fromTo` + `clearProps`。
4. **每 beat 必登记**：除原有 `data-layout` / `data-core` / `data-primitive` / `data-steps` 外，必须写 `data-start-ms`、`data-end-ms`；多步再写 `data-step-times`，其时间点按 step 2..N 顺序登记。CPSE 原语写 `data-visual-demo`；关键容器加 `data-safe-box`。
5. **风格场面必显性**：每个 beat 必须有 `style_scene` 和最终定格帧；至少使用 1 个所选风格签名组件或签名构图，核心 beat 至少 2 个。
6. **token 纪律**：beat CSS 禁止硬编码颜色和字体名，只消费风格层变量和签名类。
7. **屏幕文字短于口播且必须可追溯**；所有可见文案登记到 `content-manifest` 并绑定 `data-text-ref`，禁止捏造标签、数字、来源、引用、Logo 或假 UI。
8. **舒展版式优先**：每 beat 最多 2 个大信息区；先定 primary / secondary / negative space，再写 CSS；禁止随机散点、中心堆叠、整屏大卡片、红框调试式外框。
9. **编号语义分层**：章节装饰号、流程/清单编号、页码/folio 必须使用不同视觉角色。装饰号可作为浅色背景锚点，但不得压线、压字或贴近清单编号；流程编号必须贴近对应条目。不能通过删除装饰号或改成清单编号来规避压线问题。
10. **四段式镜头编排**：核心 beat 必须能说明 `glance → reconstruct → push → lock`；先建立视觉重心，再让信息关系发生变化，再推进关键词/远近/焦点，最后记忆定格。Claim 页可省略 reconstruct，但必须说明原因。
11. **运动预算与去重**：每 beat 最多 1 个结构运动 + 2 组辅助出现 + 1 次锁定强调；相邻 beat 的 `data-motion-signature` 不得相同；禁止整片复用同一 fade/slide/stagger；结束完全静止可截图。
12. **逐项揭示**：口播逐个讲的清单，1 项 = 1 step（预算内合并到 2-3 步时按组揭示）；禁止多项同时 stagger 涌入。
13. **验收以截图为准**：首屏、最密 beat、多步 beat 最后一步、收束页；任何真实重叠 = 失败，先改版式再重截。
14. 生成后必须运行：

```bash
node <SKILL_ROOT>/scripts/validate-motion-html.mjs path/to/output.html
```

Playwright 可用时加跑 `scripts/check-layout-browser.mjs`；不可用改 Agent 浏览器/人工截图，不为装依赖阻塞交付。

15. **SRT 是唯一主时钟**：先运行 `scripts/parse-srt.mjs`，再把 cue 范围映射到 beat。不得按字数估算替代真实时间，不得用一串 `setTimeout` 推进。
16. **时间覆盖完整**：从首条字幕开始到末条字幕结束，每个区间必须属于 `motion` 或 `broll`；相邻 beat 不重叠，空档不得超过 500ms。
17. **B-roll 是正式 beat**：没有 HTML 信息演示的区间写 `data-kind="broll" data-layout="LX-BROLL" data-broll-title="短标题"`，画面使用基座的 `.broll-scene` / `.broll-frame`，只显示 `B-ROLL`、序号和对应短标题。禁止用普通空白页或随意 placeholder 代替。
18. **录屏终态可靠**：切出浏览器录制真实 B-roll 后，回到 HTML 时按主时钟追上正确画面；暂停后主时钟必须冻结；从头重播必须可重复得到相同节奏。
19. **图片必须进入画面**：每 beat 标记 `data-mode`。`image`/`hybrid` 必须登记并实际引用 `data-asset-id`；生成但未使用的图片视为失败。
20. **转场有连续性**：除首 beat 外登记 `data-transition` 和 `data-transition-ms`。默认 350–800ms；零时长或硬切必须使用 `semantic-cut` 并写明语义原因。

## 资源导览

```
jacky-motion2-0-srt/
├── SKILL.md                        ← 流程与总规则（本文件）
├── assets/
│   ├── base-template.html          ← 固化运行时基座（拷贝后只填 4 个注入点）
│   └── styles/{id}.css             ← 风格层（当前主流程只使用 6 个重点风格）
├── styles/{id}.md                  ← 风格卡（当前主流程只主动推荐 6 个重点风格）
├── references/
│   ├── script-audit.md             ← P1 审稿标准
│   ├── storyboard.md               ← P2-P3 分镜与契约（单一入口）
│   ├── srt-autoplay.md              ← P3.5 SRT 解析、覆盖表与 B-roll 时间轴
│   ├── beat-contract.md            ← 每 beat 生成前必须填写的完整合同
│   ├── hybrid-quality-gate.md      ← 混合版审美门禁：风格 DNA / 版面 / 定格帧
│   ├── information-primitives.md   ← 信息原语判断
│   ├── layout-skeletons.md         ← L01-L10 版式骨架登记表 + 排版铁律
│   ├── motion-language.md          ← 正向运动语法 + recipe + GSAP 片段
│   ├── html-production.md          ← P4 装配规范（单一入口）
│   ├── quality-check.md            ← P5 验收清单
│   └── content-and-hybrid.md       ← 文字溯源、图片消费、动作去重与连续转场
└── scripts/
    ├── parse-srt.mjs               ← 把 SRT 解析为毫秒 cue JSON
    ├── validate-motion-html.mjs    ← 静态校验（登记表/时间轴/运行时完整性）
    └── check-layout-browser.mjs    ← 浏览器布局校验（Playwright 可选）
```

## 长内容处理

| 长度 | 处理 |
|---|---|
| 1-3 分钟 | 单一 storyboard，5-8 beat |
| 3-8 分钟 | 主轨压缩 + 连续对象，9-14 beat；细节留给 B-roll |
| 8 分钟以上 | 拆多集或多文件；单文件只做总览主轨 |
