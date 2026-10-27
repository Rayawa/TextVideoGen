# TextVideoGen

[English](README.md) | 简体中文

基于 OpenCode 的本地分场景视频制作、对齐、渲染与审查工作区。

## 项目概述

工作流组织文稿、语音、对齐、创意方案、分镜、素材、渲染、合成及审查。场景可使用 HTML/SVG、图片、混合画面或 B-roll。当前通过命令、代理及技能协作完成制作，`src/pipeline/` 仍为接口骨架，不是独立的一键生产 API。

## 技术栈与依赖

安装脚本支持 macOS Apple Silicon，需预先安装 OpenCode 与 Voicebox。隔离环境安装固定版本的 Node/pnpm、Python/uv、WhisperX、Chromium、Playwright、FFmpeg 及模型。版本以锁文件为准，服务凭据在本地配置。

## 文件结构

- `bin/` — 命令包装入口
- `scripts/` — 环境、渲染及检查工具
- `src/` — 流水线接口及运行代码
- `config/` — 运行时锁定与配置
- `schemas/` — 项目结构约束
- `prompts/` — 制作提示词
- `projects/` — 逐视频工作区
- `.videoenv/` — 本地运行环境

## 快速上手

在完整源码目录执行：

```bash
./bin/setup
./bin/check-environment
./bin/opencode-video
```

首次安装会下载运行时、浏览器依赖和模型。可用 `./bin/setup --skip-voicebox-model` 暂缓该模型下载，之后再次运行 setup 补齐。包命令和媒体工具使用包装入口；生成内容保存在对应项目中。最终交付遵循 [AGENTS.md](AGENTS.md) 中的审查门禁。
