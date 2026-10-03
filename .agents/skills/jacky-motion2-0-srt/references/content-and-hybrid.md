# 内容来源、图片混合与连续运动

本规范专门阻止三类已出现的问题：HTML 编造文字、生成图片没有进入成片、以及重复动画与突变翻页。制作分镜、装配 HTML 和 QA 时都必须读取。

## Content manifest

每个交付 HTML 必须包含一个 JSON 清单，所有可见文案和生成图片都以 ID 登记：

```html
<script type="application/json" id="content-manifest">
{
  "text": {
    "t-hook": {"value":"英语启蒙的四道关","source":"script:v2#hook"},
    "t-gate-1": {"value":"听懂","source":"srt:v2#cue-12"}
  },
  "assets": {
    "scene-03-hero": {
      "path":"assets/hero.webp",
      "source":"image_generate:request-17",
      "generated":true,
      "sceneId":"scene-03"
    }
  }
}
</script>
```

每个可见文案容器使用 `data-text-ref="t-hook"`，文字必须与清单中的 `value` 一致。`source` 只能指向原始脚本、SRT cue、用户提供的品牌文案或已批准 creative treatment。禁止临场生成说明性小字、按钮、数字、引用、Logo、假 UI、页码话术或“更好看”的填充文案。纯装饰图形不得含文字。

## Scene mode and image consumption

每个 beat 写 `data-mode="html|image|hybrid|broll"`。`html` 用于文字、数字、数据、图表、流程、关系、UI 和抽象结构；`image` 用于人物、场景、环境、具体物体、情绪或概念插画；`hybrid` 用于需要真实视觉主体且同时需要解释层；`broll` 用于真实录屏或现有素材窗口。

`image` 和 `hybrid` 必须填写 `data-asset-refs`，实际 `<img>`/`<picture>` 元素必须有匹配的 `data-asset-id`。图片先生成并写入 scene-local `assets/manifest.json`，HTML 再引用相对路径。Hybrid 中图片承担主体、环境、证据或材质，HTML 只补充构图、遮罩、标签、箭头、图表和局部运动；不要把图片藏在不可见背景，也不要在已有图片主体上重新造一个无关 HTML 主视觉。任何 `generated:true` 的图片若没有 `data-asset-id` 消费，校验失败。

## Text and asset attributes

每个 motion beat 至少声明：

```html
<section class="beat" data-kind="motion" data-mode="hybrid"
  data-text-refs="t-title,t-label" data-asset-refs="scene-03-hero"
  data-motion-signature="camera-push-annotation"
  data-transition="shared-object" data-transition-ms="500">
```

`data-motion-signature` 描述主导动作而不是 easing 名，例如 `path-build`、`split-compare`、`camera-push-annotation`、`number-to-system`。相邻 beat 不得使用相同签名；同一签名可以在后文复用，但构图、焦点或信息关系必须不同。

## 连续转场

默认转场为 350–800ms 的 `crossfade`、`shared-object`、`camera` 或 `hold`。`shared-object` 应登记从上一 beat 延续的对象。不要先把整页清空再让下一页从零淡入；保留至少一个构图锚点、颜色区、线、图片主体或标题位置，让观众感到同一个叙事在推进。

只有导演方案明确要求语义冲击时可使用 `semantic-cut`，并填写 `data-hard-cut-reason`。没有原因的零时长换页直接失败。结尾保持最终帧，不 fade to black，不自动翻回开头。

## 去重规则

- 连续两个 beat 不得使用相同 motion signature。
- 不得给所有页面复用同一个 fade/slide/stagger 入场函数。
- 一次只推进一个信息关系；列表按口播触发逐项或分组揭示。
- 同一镜头最多一个结构运动、两组辅助出现、一次锁定强调。
- 连续 2–4 个 beat 讲同一机制时，至少保留一个 continuity object。
- QA 必须按时间抽看相邻 beat 的切换，而不只看静态截图。
