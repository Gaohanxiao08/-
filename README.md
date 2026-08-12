# 中国政策过程多智能体计算模拟平台

原创声明：本项目为 @Gaohanxiao08 原创开发，拥有完整知识产权。

## 版权声明

Copyright © 2025 笑笑 (Gaohanxiao08). All Rights Reserved.

本项目为作者独立开发的原创作品，未经作者书面授权，禁止用于商业用途。

## 项目概述

一个基于 DeepSeek 大语言模型的多智能体博弈模拟系统，用于学术研究中国政策制定过程中的多方协商与决策机制。

### 核心特性

- 多智能体博弈：支持多个 AI 智能体同时参与政策讨论
- DeepSeek API 集成：每个智能体可配置独立的 DeepSeek API 与模型（deepseek-chat / deepseek-reasoner）
- 双层博弈展示：台面对话 + 底层策略分析
- 制度身份驱动建模：职位、激励结构、部门职责、约束体系、六维权力配置、九维话术风格
- 四维环境系统：政治、经济、社会、制度环境参数实时注入每个智能体的系统提示词
- 关系网络：智能体之间关系类型/强度/信任度动态影响发言，信任度随博弈过程演化
- If-Then 规则引擎：环境/关系/主体/博弈状态条件触发，可修改偏好权重、资源、环境、关系、共识度与话术提示
- 决策追溯可视化：完整展示 AI 的思考过程和决策逻辑（优先接入模型真实推理链）
- 知识库系统：支持导入政策文件、历史文献（当前版本为前端资料管理，尚未接入检索）

## 技术栈

- Framework: Next.js 16 (App Router)
- Core: React 19
- Language: TypeScript 5
- UI: shadcn/ui + Tailwind CSS 4
- AI: DeepSeek API（流式输出）
- Package Manager: pnpm

## 项目结构

```
├── scripts/                 # 开发/构建/启动脚本
│   ├── dev.sh               # 开发环境启动
│   ├── build.sh             # 生产构建
│   ├── start.sh             # 生产启动
│   └── prepare.sh           # 依赖预处理
├── src/
│   ├── app/
│   │   ├── page.tsx              # 模拟平台主页面（场景选择 + 实时博弈展示）
│   │   ├── layout.tsx            # 布局
│   │   ├── globals.css           # 全局样式与设计 Tokens
│   │   └── api/simulate/route.ts # 模拟 API（GET 场景列表 / POST SSE 流式模拟）
│   ├── lib/
│   │   ├── simulation/           # 模拟引擎
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── engine.ts         # 核心引擎（轮次调度 + 共识计算）
│   │   │   ├── rule-engine.ts    # If-Then 规则求值引擎
│   │   │   ├── llm.ts            # DeepSeek 客户端（流式 + 非流式 + 推理链）
│   │   │   ├── scenarios.ts      # 场景配置（环保督察 + 新医改）
│   │   │   └── prompt-builder.ts # Prompt 构建器
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

### 配置 API

复制 `.env.example` 为 `.env` 并填写 `DEEPSEEK_API_KEY`；也可以在页面中为每个智能体单独配置：

- API Key
- Base URL (默认: https://api.deepseek.com/chat/completions)
- 模型选择 (默认: deepseek-chat；选择 deepseek-reasoner 可获取真实推理链)

### 开发环境

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 使用说明

### 1. 选择场景

目前内置两个场景：

- 中央环保督察政策协调模拟（中央督察组、省级政府、生态环境部）
- 新医改政策协调 5 轮谈判（国家发改委、卫健委、财政部）

### 2. 设置规则

- 配置博弈轮次（场景协议内置）
- 设置环境参数（政治、经济、社会、制度四维）
- 定义智能体关系网络（类型/强度/信任度）
- 添加自定义 If-Then 规则

### 3. 开始模拟

点击"开始博弈"，观察智能体之间的博弈过程：

- 实时查看对话流（场面话 + 潜台词）
- 查看底层指标权衡与环境影响
- 查看规则评估日志（哪些规则被触发、命中哪些条件）
- 追踪共识度变化与轮次小结（争议点、共识、指标相互作用、信任变化）
- 追溯决策逻辑（思考链）

## 核心概念

### 智能体建模

每个智能体包含：

- 制度身份（职位、激励结构、部门责任、行政层级）
- 六维权力配置（议程设置、否决、资源分配、信息控制、人事、执行强制）
- 偏好权重（效用函数参数）
- 硬/软约束条件
- 九维话术风格参数

### 双层博弈架构

- 台面层：智能体的公开表态（场面话）
- 策略层：智能体的真实意图和策略分析（潜台词）

### 效用函数

```
U(a) = Σ wᵢ × gᵢ(a)
```

其中 wᵢ 为偏好权重，gᵢ 为各维度收益。

### If-Then 规则引擎

规则由"条件"（环境指标、关系属性、主体属性、博弈状态）与"效果"组成：

- modify_preference_weight / modify_resource：按系数调整偏好或资源（基于基线快照，跨轮次不叠加）
- modify_environment / modify_relationship：调整环境参数或关系强度/信任度
- modify_consensus：在共识评估基础上修正共识度（每轮每规则仅计一次）
- add_constraint：为 Agent 追加约束
- trigger_discourse：为 Agent 注入本轮话术提示

### 决策追溯的诚实性说明

- 当 Agent 配置 `deepseek-reasoner` 且启用思考记录时，系统读取模型的 `reasoning_content` 作为真实思考链
- 当模型未返回推理链（如 deepseek-chat）或未启用思考记录时，界面会生成并明确标注"启发式决策摘要"，不代表模型真实思考过程

### SSE 事件协议

模拟过程通过 SSE 推送以下事件：

`round_start` → `agent_thinking` → `agent_speaking` → `decision_trace` → `rule_evaluated` → `round_end` → `consensus_update` → `round_summary` →（末轮）`simulation_end` / `simulation_complete`

## 已知边界

- 知识库当前为前端资料管理模块，尚未实现文档检索与规则自动提取
- 动作启用/禁用类规则效果（enable_action / disable_action）仅记录命中，尚未接入动作注册表
- API Key 由浏览器发送至服务端，生产部署建议改为服务端密钥管理

## 许可证

本项目采用 CC BY-NC 4.0 许可证 - 详见 LICENSE 文件。

简要说明：

- ✅ 可以分享、复制本项目的代码
- ✅ 可以修改、改编本项目
- ❌ 不得用于商业用途
- ✅ 必须署名（注明原作者：笑笑 / Gaohanxiao08）

## 贡献

欢迎提交 Issue 讨论交流。

如需商业合作，请联系作者。

## 作者

如果这个项目对你有帮助，欢迎给个 Star ⭐ 支持一下！
