# 以内容关系驱动的连续动画

新制作默认采用 `semantic-motion`；现有 SRT 演示技能和历史 project 保持兼容。它不要求新模型、新 provider 或新依赖，也不把全部 pipeline 冒充为已经实现的自动化。

先给出观看后的一个理解目标，再设计主对象、关系变化和落点。例如“听力牵引阅读”：听力对象先启动、连接拉紧、阅读对象再跟随；“级别领先”随后用两个独立标尺表达，不能把牵引的短暂延迟冒充为 1.5 年级别差。沿用 source 的业务结论，动画不添加未经来源支持的数值和解释。

## 制作契约

`productionProfile: semantic-motion` 的 storyboard 使用 `motionContract`：

- `renderer`: dom-svg / canvas / webgl / hybrid。
- `objects`: 每个对象有唯一 `id`、`role` 和持续的 `continuity`。
- `beats`: `startMs/endMs` 为全片时间，明确 `meaning`、`before/action/after`、`objectIds`、`signature` 和 `cueIndexes`。覆盖 shot，时间来自 alignment；连续 beat 不得只是更换名字的相同入场动作。
- `probes`: `atMs` 为全片时间；`assertions` 检查实际 `[data-object-id]` 的 x/y/width/height/opacity，用 gt/gte/lt/lte/eq 比较常量或另一对象属性。这些证据只证明观察到的关系。
- assertion 可加 `changeFromMs`，比较对象从较早时刻到当前时刻的实际位移；用它验证“车头已移动但车厢尚未启动”，不能只检验最终左右位置。
- `reviewQuestions`: 人工语义审片要回答的具体问题。
- `layoutBoxes`: 对应 `[data-layout-box]` 的明确允许矩形，字幕也必须登记。

HTML 保持单一 `renderAt(ms)`，参数为 shot 内的局部时间。无论正向、倒序还是重复 seek，得到同一画面。一个长 shot 可以含多个 beats；scene-local 的素材隔离不意味着必须断开对象或切页。

## 检查与渲染

```bash
./bin/pnpm-video motion:content-check projects/<id>/plan/storyboard-v1.json projects/<id>/scenes/scene-001/assets/motion-v1.html projects/<id>/qa/content-check-v1.json
./bin/pnpm-video test:motion
```

检查命令针对单 scene HTML（storyboard 可含多个 scene；额外参数传 sceneId）。实际抽样检查：对齐 cue 边界、每 beat 的开始/中点/结束、每 250ms、relation probes、最终帧。采集文字溯源、可见文字碰撞、指定盒子的越界、对象关系及倒序 seek。失败以非零退出；报告所有发现，不自动扩大重算范围。

shared renderer 默认 30 fps；快速运动可显式 60 fps。调用方仍须明确 fps 并在 manifest 登记；历史脚本显式 15 fps 不修改以保留可复现性。合成不能靠调高输出 fps 获得流畅运动。

## 门禁

几何检查通过后仍需 GPT 检查实际截图和成片：动作是否表达旁白、相邻关系是否清楚、转场是否实施、是否有混淆因果/量纲的隐喻、画面是否拥挤、关键点是否有稳定停留。关键文字相互遮挡、未落实分镜、低帧率重复补帧、未引用图片均为 blocker，不能用“仅 advisory”略过。保留原文/语音/对齐；不扩大重写范围。只在用户最终 review 通过后 deliver。
