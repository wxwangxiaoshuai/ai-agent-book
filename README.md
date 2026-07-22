# AI Agent 大师之路

> 一套从零到架构师的 AI Agent 开发实战课程，以前端站点形式呈现。

## ✨ 项目简介

本课程面向希望从 AI Agent 开发小白成长为架构师专家的开发者，内容深入浅出、循序渐进，每一模块都配有实战项目。

- **16 大模块 / 91 节精讲课 / 16 个递进式实战项目 / ~159 小时**
- 七阶段成长路径：筑基 → 上下文与知识 → Agent 核心 → 记忆执行与编排 → 多智能体与多模态 → 质量保障 → 架构设计与生产落地
- 覆盖：LLM 基础、Prompt 工程、上下文工程、RAG、Agent 核心架构、工具/MCP、Harness 工程化、记忆系统、代码沙箱、框架编排、多智能体、多模态、评估/测试/护栏/安全、架构设计/案例拆解、生产架构/运维/SRE、Computer Use/A2A、毕业设计

## 🚀 技术栈

- **Vite 5** — 极速构建与 HMR
- **React 18 + TypeScript** — 类型安全
- **Tailwind CSS 3** — 原子化样式与设计系统
- **React Router 6** — 客户端路由

## 📦 本地运行

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 (http://localhost:5173)
pnpm build       # 生产构建
pnpm preview     # 预览构建产物
```

## 🌐 发布到 GitHub Pages

本项目已配置 GitHub Actions 自动部署，推送到 `main` 或 `master` 分支后会自动构建并发布。

### 首次启用步骤

1. 在 GitHub 创建仓库并推送代码（仓库名建议为 `ai-agent-book`，也可使用其他名称）
2. 进入仓库 **Settings → Pages**
3. **Build and deployment → Source** 选择 **GitHub Actions**
4. 推送代码到 `main`/`master`，或在 Actions 页手动运行 **Deploy to GitHub Pages** workflow

部署完成后访问：`https://<你的用户名>.github.io/<仓库名>/`

### 本地预览 Pages 构建

若仓库名不是 `ai-agent-book`，构建时需指定 base path：

```bash
VITE_BASE_PATH=/你的仓库名/ pnpm build:pages
pnpm preview
```

> `build:pages` 会在构建后复制 `index.html` 为 `404.html`，以支持 React Router 的客户端路由刷新。

## 📂 目录结构

```
src/
├── components/     # 共享 UI 组件（Layout、Badges、CodeBlock）
├── data/           # 课程数据模型与大纲内容
│   ├── curriculum.ts   # 完整课程大纲（16 模块 / 91 节课 / 16 项目）
│   └── types.ts         # TypeScript 类型定义
├── pages/          # 页面（首页、大纲、模块、路线图、项目）
├── router.tsx      # 路由配置
├── main.tsx        # 应用入口
└── index.css       # 全局样式 + Tailwind
```

## 📖 课程大纲速览

| 阶段 | 模块 | 主题 |
|------|------|------|
| 筑基 | M1-M2 | LLM 基础与开发环境 · Prompt 工程实战 |
| 上下文与知识 | M3-M4 | 上下文工程 · RAG 深度实战 |
| Agent 核心 | M5-M7 | Agent 核心架构 · 工具/MCP · Harness 工程化 |
| 记忆执行与编排 | M8-M10 | 记忆系统 · 代码沙箱 · 框架编排 |
| 多智能体与多模态 | M11-M12 | 多智能体系统 · 多模态 Agent |
| 质量保障 | M13 | 评估 · 护栏 · 测试 · 可观测性 |
| 架构设计与生产落地 | M14-M16 | 架构设计/案例拆解 · 生产架构/运维 · 前沿范式/毕业设计 |

---

> 课程内容持续完善中。
