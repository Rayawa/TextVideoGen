# 分镜与节拍契约（Phase 2-3 单一入口）

读完本文件可完成分镜。锁风格和逐 beat 契约时必须继续读 [beat-contract.md](beat-contract.md) 与 [hybrid-quality-gate.md](hybrid-quality-gate.md)。版式细节查 [layout-skeletons.md](layout-skeletons.md)，运动细节生成时查 [motion-language.md](motion-language.md)。

## 1. 主轨压缩（先做，再拆 beat）

HTML 是口播视频的主轨结构，不是逐句字幕。只保留观众必须**看见**的核心节点：开场判断、核心问题、关键对比、方法路径、必要证据、结论收束。解释句和过渡句由当前主轨画面承接；真实产品、网站、操作、素材或案例展示标为 `b_roll_window`，在最终 HTML 中生成正式 B-roll 画框 beat。

节拍预算：

| 口播长度 | beat 数 |
|---|---|
| 1-3 分钟 | 5-8 |
| 3-5 分钟 | 7-10 |
| 5-8 分钟 | 9-14 |
| 8 分钟以上 | 拆多集；单文件只做总览主轨 |

每个 beat 覆盖 15-30 秒口播（约 60-120 个中文字）。只有发生以下变化才新增 beat：观点转折、信息关系改变、章节切换、强对比、关键证据、流程阶段变化。**禁止一句话一个 beat、一个自然段一页。**

## 2. 信息原语判断

每个 beat 先归入一个主原语（详见 [information-primitives.md](information-primitives.md)）：

Claim 判断 → Contrast 对比 → Path 路径 → System 机制 → Evidence 证据，按此顺序问；选不出说明 beat 太泛，先改写核心信息。

## 3. 分镜表（Phase 2 产出，等用户确认）

```
节拍 | SRT cue与时间范围 | mode(html/image/hybrid/broll) | 核心信息 | textRefs | assetRefs | 原语 | 版式 | motion signature | transition | 四段式镜头 | steps与时间点 | 风险
```

硬约束：
- 核心信息只能一句话，不写并列观点
- 屏幕文字必须短于口播，是视觉索引不是字幕
- 版式必须来自 layout-skeletons.md 登记表（L01-L10 或登记的自定义）
- steps 默认 2-3，最多 4；Contrast/Path/System/Evidence 至少 2
- 每段必须登记 SRT cue、`startMs`、`endMs`；多步 beat 还要登记 step 2..N 的绝对毫秒点
- `broll` 必须使用 `LX-BROLL` 与具体小标题；最终 HTML 只允许指定 B-roll beat 出现 `B-ROLL` 标签，其他 beat 禁止泄漏制作提示
- `image`/`hybrid` 必须先列出 scene-local 图片需求和 `assetRefs`；生成图片必须在该 scene 的 HTML 或镜头中实际使用
- 所有屏幕文字先登记 `textRefs` 和来源；不得为了排版临时添加没有来源的文字
- 相邻 beat 的 motion signature 不得重复；转场默认使用 crossfade/shared-object/camera/hold，硬切必须写语义理由
- `风格场面` 必须写出该页靠什么识别所选风格，不能只写风格名
- `四段式镜头` 必须写 `glance / reconstruct / push / lock`；Claim 页可省略 reconstruct，但必须说明“静止帧已成立”
- 风险提前标：页数过多、长标题、节点过多、截图可读性、中心堆积

## 4. Beat 契约（Phase 3 产出，每 beat 一份）

完整字段以 [beat-contract.md](beat-contract.md) 为准。下面是输出时的压缩格式：

```md
beat: b3
track: motion
timing: cue 8-14 · 00:21.400-00:38.200 · startMs 21400 · endMs 38200
core: 一句话核心信息
primitive: Path
spoken_estimate: 22s（中文 4 字/秒）
screen_text: 屏幕上出现的全部文字（短语级）
layout: L04 · 标题上轴，流程横贯下方主轴，留白推进方向向右
style_scene: apple-tech-gradient · 黑色发布会空间 + 光场路径线 + 轻玻璃节点
attention_path: 第一眼[标题] → 推进[节点逐个] → 定格[完整路径+结论词]
camera_acts:
  glance: 标题先落位，观众知道这页看“三步”
  reconstruct: 节点从单点重构为横向路径，线段在独立轨道生长
  push: 当前节点被推近/点亮，前序节点降亮保留上下文
  lock: 全路径稳定，结论词短促强调后完全静止
visual_demo: path-line-draw（CPSE 必填；只能写具体演示，不许写"淡入/出现"）
recipe: path-build（省略阶段：无 / Claim 页写明省略 relation 的原因）
steps:
  - s1: 21400ms · 口播触发[讲完问题时] · 焦点[标题+首节点] · 保留[—] · 终态[首节点稳定]
  - s2: 27600ms · 触发[说到"第二步"] · 焦点[节点2+连线] · 保留[节点1 稳定] · 终态[两节点连通]
  - s3: 33100ms · 触发[说到"最后"] · 焦点[节点3+结论词] · 保留[前两节点] · 终态[全路径+红字锁定]
continuity: 路径线从 b3 延续到 b5（b4 灰化为背景，b5 重新点亮末段）
mode: hybrid
text_refs: t-b3-title,t-b3-step-1,t-b3-step-2
asset_refs: scene-03-hero
motion_signature: path-build-over-image
transition: shared-object · 500ms · 延续路径线
risks: 节点文字过长→限 6 字；连线穿卡→用 flow 轨道
```

字段规则：
- `attention_path.final_lock` 就是截图验收帧——先想定格帧，再反推运动
- timing 必须来自真实 SRT cue；step 时间钉在语义触发词所在 cue，不做等分估算
- `camera_acts` 是短视频镜头编排，不是动画清单；必须体现视觉重心入场、画面重构、关键信息推进、记忆定格
- 每步只演一件事，新增 1-3 个信息对象；已出现内容保持稳定（允许灰化/降亮/轻让位，禁止重播、重排、漂移）
- 每步终态必须可稳定截图；找不到 visual_demo 的 step 通常不该上屏，合并进口播
- 不合格契约：core 讲两件事 / first_glance 写"整页" / style_scene 缺失 / camera_acts 写成"淡入、出现、结束" / visual_demo 写"卡片出现" / 多步 beat 缺 steps / layout 写"自由发挥" / risks 全写"无"

## 5. 连续对象（3 分钟以上的稿子必须考虑）

长口播最容易变成"每页重新开始的 PPT"。连续 2-4 个 beat 解释同一机制时，让关键对象（路径线/截图/概念词/主数字/框架/证据编号）跨 beat 存在——可以变形、缩小、让位、灰化，不许无故消失后重新出现。

- 契约写法：`continuity: 对象 X 从 bN 到 bM，每段怎么变`
- 同一对象跨 beat 的位置、颜色、命名变化必须有规律
- 连续对象不能抢当前 beat 的主视觉
- 验收标准：回看整段，观众感到信息在"演进"，不是一页页切换

## 6. 风格锁定（Phase 3 同时输出）

按 SKILL.md 的风格选择矩阵推荐，读所选 [styles/{id}.md](../styles/) 风格卡和 [hybrid-quality-gate.md](hybrid-quality-gate.md) 后输出：

```
风格：[id]
选择理由：[内容气质 / 素材类型 / 信息结构]
全片视觉锚点：[首屏主视觉、强调色用法、字体层级、构图语法、运动个性]
风格 DNA：[本片必须反复出现的 2-3 个签名组件/签名动作]
连续对象：[如有]
```

全片单一风格，不可混搭；颜色、字体、卡片材质、运动节奏都不能跨风格借用。如果内容不适合所选风格，换风格，不要把风格改到失去记忆点。
