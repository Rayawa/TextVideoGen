# Beat 生成契约

每个 beat 写 HTML 前必须先填契约。契约是从口播信息到画面设计的桥，不是文档装饰。缺关键字段时，不进入 HTML。

## 合同模板

```md
beat_id:
core_message:
information_primitive: Claim / Contrast / Path / System / Evidence
spoken_duration_estimate:
screen_text:
track_role: motion / broll
scene_mode: html / image / hybrid / broll
text_refs:
asset_refs:
srt_timing:
  cue_range:
  start_ms:
  end_ms:
b_roll:
  title:
  frame_subject:

composition:
  layout_skeleton:
  style_scene:
  anchor_axis:
  primary_zone:
  secondary_zone:
  negative_space_role:
  rhythm:
    title_line_height:
    body_line_height:
    group_gap:
    alignment_rule:

attention_path:
  first_glance:
  second_focus:
  final_lock:

camera_acts:
  glance:
  reconstruct:
  push:
  lock:

reconstruction:
  from_state:
  to_state:
  changed_relation:
  recipe:

motion_budget:
  signature:
  structure_motion:
  supplement_groups:
  memory_lock:
  omitted_phases:

visual_demo:
  type:
  why_it_serves_information:

step_contract:
  - step:
    at_ms:
    spoken_trigger:
    primary_focus:
    visual_demo:
    relation_change:
    persistent_context:
    final_state:
    duration_budget:

continuity_object:
  object:
  persists_from:
  persists_to:
  transform:

transition:
  type: crossfade / shared-object / camera / hold / semantic-cut
  duration_ms:
  hard_cut_reason:

validation_risks:
  overlap:
  center_cluster:
  line_crossing:
  nav_collision:
  text_overflow:
```

## 字段规则

- `core_message`: 只允许一句话，不写并列观点。
- `screen_text`: 必须短于口播，只做视觉索引。
- `text_refs`: 每段可见文字都必须对应 content manifest 中的来源 ID，且文字值完全一致。
- `scene_mode`: `image`/`hybrid` 必须填写 `asset_refs` 并在 HTML 中实际消费；禁止生成无下游用途的图片。
- `track_role`: 只允许 `motion` 或 `broll`。解释句和过渡句由当前 motion beat 承接；需要真实界面、操作、素材或案例时才进入 broll。
- `srt_timing`: 必须来自真实 SRT cue。`start_ms < end_ms`；相邻 beat 不重叠，空档不超过 500ms。
- `b_roll`: `track_role=broll` 时必填，标题写 4-14 个汉字的具体展示对象；使用 `LX-BROLL`，不填写普通 camera_acts 与 step_contract。
- `layout_skeleton`: 必须是 L01-L10 或有登记说明的 `LX-*`。
- `style_scene`: 写清这页靠什么识别所选风格，例如“浅蓝产品页 + 主截图 + 蓝色路径线”，不能写“好看”。
- `primary_zone`: 主视觉区域，说明左/右/上/下/全轴位置和大致占比。
- `negative_space_role`: 留白用于推进方向、对比缓冲、记忆定格或截图安全。
- `rhythm`: 写清标题行高、正文行高、组间距和对齐规则。
- `first_glance`: 观众 1 秒内应该看的唯一对象。
- `final_lock`: 动画结束后的记忆点，也是截图验收帧。
- `camera_acts`: 四段式短视频镜头。`glance` 是视觉重心入场；`reconstruct` 是画面关系变化；`push` 是关键词/节点/证据被推近，非焦点退后；`lock` 是记忆定格。Claim 页可省略 `reconstruct`，但必须写明原因。
- `changed_relation`: 必须说明信息关系如何变化；只写“淡入/出现/上移”不合格。
- `motion_budget`: 每 beat 最多 1 个结构运动 + 2 组辅助出现 + 1 次最终强调。
- `signature`: 写信息动作，如 `path-build` 或 `camera-push-annotation`；相邻 beat 不得重复。
- `transition`: 除首 beat 外必填。默认 350–800ms；`semantic-cut` 必须写 `hard_cut_reason`。
- `visual_demo`: Contrast / Path / System / Evidence 必填；必须是具体演示，如 `path-line-draw` / `split-compare` / `evidence-spotlight`。
- `step_contract`: 多步 motion beat 必填；每步必须有 `at_ms`、`primary_focus`、`visual_demo`、`persistent_context`、`final_state`。step 2..N 的 `at_ms` 严格递增并落在 beat 时间内。
- `continuity_object`: 长稿优先保留跨 beat 对象，让画面像连续演示而不是翻 PPT。
- `validation_risks`: 必须写真实风险，不能全写“无”。

## 不合格契约

- `core_message` 同时讲两件事。
- `first_glance` 写“整页”或“所有卡片”。
- `style_scene` 缺失，或只写风格名。
- `camera_acts` 写成动画效果清单，如“淡入、上移、出现、结束”，没有说明视觉重心、关系变化、焦点推进、记忆定格。
- `changed_relation` 写“元素依次出现”。
- CPSE beat 的 `visual_demo` 缺失或只写“淡入/出现”。
- 多步 beat 缺 `step_contract`，或 step 的 `final_state` 缺失。
- `layout_skeleton` 写“自由发挥”。
- `screen_text` 是口播原文。

## Step 质量

一个 step 是一次注意力推进，不是一个元素 reveal。只有以下情况才新增 step：

- 列表项被口播逐个讲述。
- 流程节点向前推进。
- 对比关系从旧状态转到新状态。
- 系统层级展开一层。
- 证据被聚焦、标注或落结论。
- 主视觉让位给辅助结构。

每个 step 只新增 1-3 个信息对象；已出现内容保持稳定，允许灰化、降亮、轻让位，禁止重播、重排、随机漂移。每步结束必须能稳定截图。

## 注意力质量分配

- 主视觉：45%-65%
- 辅助结构：20%-35%
- 上下文标签：5%-15%
- 装饰：0%-5%

留白可以大，但必须有方向。元素可以少，但主视觉必须足够重。
