# 中国政策过程多智能体计算模拟平台

> **原创声明**：本项目为 [@Gaohanxiao08](https://github.com/Gaohanxiao08) 原创开发，拥有完整知识产权。

<div align="center">

**作者**: 笑笑 (Gaohanxiao08)  
**项目类型**: 学术研究工具  
**创建时间**: 2025年

[![Original Work](https://img.shields.io/badge/Original-Work-blue)](https://github.com/Gaohanxiao08/-)
[![Author](https://img.shields.io/badge/Author-笑笑-red)](https://github.com/Gaohanxiao08)

</div>

---

## 版权声明

Copyright © 2025 笑笑 (Gaohanxiao08). All Rights Reserved.

本项目为作者独立开发的原创作品，未经作者书面授权，禁止用于商业用途。

## 项目概述

一个基于 DeepSeek 大语言模型的多智能体博弈模拟系统，用于学术研究中国政策制定过程中的多方协商与决策机制。

### 核心特性

- **多智能体博弈**：支持多个 AI 智能体同时参与政策讨论
- **DeepSeek API 集成**：每个智能体可配置独立的 DeepSeek API
- **双层博弈展示**：台面对话 + 底层策略分析
- **决策追溯可视化**：完整展示 AI 的思考过程和决策逻辑
- **规则引擎**：支持自定义 If-Then 规则
- **环境建模**：政治、经济、社会、制度四维环境系统
- **关系网络**：可视化智能体之间的关系动态
- **知识库系统**：支持导入政策文件、历史文献

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **AI**: DeepSeek API (流式输出)

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # 主页面
│   │   ├── layout.tsx            # 布局
│   │   └── api/simulate/route.ts # 模拟 API
│   ├── lib/
│   │   ├── simulation/           # 模拟引擎
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── engine.ts         # 核心引擎
│   │   │   ├── llm.ts            # DeepSeek 客户端
│   │   │   ├── scenarios.ts      # 场景配置
│   │   │   └── prompt-builder.ts # Prompt 构建
│   │   └── utils.ts              # 工具函数
│   ├── components/ui/            # shadcn/ui 组件
│   └── hooks/                    # 自定义 Hooks
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发环境

```bash
pnpm dev
```

访问 http://localhost:5000

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 使用说明

### 1. 配置 API

在页面中为每个智能体配置 DeepSeek API：
- API Key
- Base URL (默认: https://api.deepseek.com)
- 模型选择 (默认: deepseek-chat)

### 2. 选择场景

目前支持：
- 新医改博弈场景（国家发改委、卫健委、财政部）

### 3. 设置规则

- 配置博弈轮次
- 设置环境参数（政治、经济、社会、制度）
- 定义智能体关系网络
- 添加自定义规则

### 4. 开始模拟

点击"开始模拟"，观察智能体之间的博弈过程：
- 实时查看对话流
- 分析底层策略
- 追溯决策逻辑

## 核心概念

### 智能体建模

每个智能体包含：
- 制度身份（职位、激励结构、部门责任）
- 偏好优先级
- 硬约束条件
- 否决权

### 双层博弈架构

1. **台面层**：智能体的公开表态（场面话）
2. **策略层**：智能体的真实意图和策略分析（潜台词）

### 效用函数

```
U(a) = Σ wᵢ × gᵢ(a)
```

其中 wᵢ 为偏好权重，gᵢ 为各维度收益。

## 在线演示

https://8bm7jyn6jk.coze.site/

## 许可证

本项目采用 **CC BY-NC 4.0** 许可证 - 详见 [LICENSE](LICENSE) 文件。

**简要说明**：
- ✅ 可以分享、复制本项目的代码
- ✅ 可以修改、改编本项目
- ❌ 不得用于商业用途
- ✅ 必须署名（注明原作者：笑笑 / Gaohanxiao08）

## 贡献

欢迎提交 Issue 讨论交流。

如需商业合作，请联系作者。

## 作者

- **GitHub**: [@Gaohanxiao08](https://github.com/Gaohanxiao08)
- **项目地址**: https://github.com/Gaohanxiao08/-

---

<div align="center">

**如果这个项目对你有帮助，欢迎给个 Star ⭐ 支持一下！**

</div>
