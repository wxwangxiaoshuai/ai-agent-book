## MCP（Model Context Protocol）入门

Function Calling 让模型能调工具，但每个 Agent 框架（LangChain、CrewAI、AutoGen）都有自己的工具定义格式——同一个"搜索"工具，在 LangChain 里是一种写法，在 CrewAI 里是另一种。**MCP 就是解决这个"工具格式碎片化"问题的统一协议。**

### MCP 的定位：USB-C for AI

```
没有 MCP 的世界：                有 MCP 的世界：

LangChain 工具 ──→ Agent A       MCP Server ──→ MCP 协议 ──→ 任何 MCP 客户端
CrewAI 工具   ──→ Agent B        （搜索）           ↑         (Claude Desktop,
自定义工具    ──→ Agent C                          ↑          Cursor, 自建 Agent)
                                              一个协议
                                              连接一切
```

MCP（Model Context Protocol）由 Anthropic 在 2024 年提出，目标是**让任何 LLM 客户端都能连接任何工具服务器**——就像 USB-C 让任何设备都能用同一根线充电。

### MCP 的 Client-Server 架构

```
┌──────────────┐     MCP 协议     ┌──────────────┐
│  MCP Client  │ ←──────────────→ │  MCP Server  │
│  (Claude,    │                  │  (搜索工具,   │
│   Cursor,    │                  │   数据库,     │
│   自建Agent) │                  │   文件系统)   │
└──────────────┘                  └──────────────┘
```

- **MCP Client**：需要使用工具的 LLM 应用（Claude Desktop、Cursor IDE、你的 Agent）
- **MCP Server**：提供工具能力的独立服务（搜索、数据库查询、文件操作等）
- **MCP 协议**：Client 和 Server 之间的通信标准（基于 JSON-RPC）

### 三类原语：Tools、Resources、Prompts

MCP Server 可以暴露三类能力：

| 原语 | 作用 | 类比 | 示例 |
|------|------|------|------|
| **Tools** | 模型可以调用的函数 | Function Calling | search()、get_weather() |
| **Resources** | 模型可以读取的数据 | 文件系统 | 数据库内容、配置文件 |
| **Prompts** | 预定义的 Prompt 模板 | 快捷指令 | "代码审查模板"、"摘要模板" |

```
Tools    →  模型主动调用（"我要搜索"）
Resources →  由 Client 读取后注入上下文（不是模型自动拉取）
Prompts  →  用户触发的快捷操作（"用审查模板检查这段代码"）
```

### MCP vs Function Calling

| 维度 | Function Calling | MCP |
|------|-----------------|-----|
| 定义层 | API 层（OpenAI/Anthropic 各自定义） | 协议层（跨平台标准） |
| 工具来源 | 开发者在代码中定义 | 独立 Server 提供，Client 动态发现 |
| 复用性 | 每个框架要重新定义 | 一次实现，所有 MCP 客户端可用 |
| 生态 | 各框架独立生态 | 统一生态（任何 MCP Server ↔ 任何 Client） |

**关键区别**：Function Calling 是"你的 Agent 调你定义的工具"，MCP 是"任何 Agent 调任何 Server 提供的工具"。

### MCP 生态现状（2025-2026）

**MCP Client（消费方）**：
- Claude Desktop / Claude Code
- Cursor IDE
- Zed Editor
- 任何实现了 MCP Client SDK 的自建应用

**MCP Server（提供方）**：
- 官方 Server：Filesystem、GitHub、Slack、PostgreSQL、Google Drive...
- 社区 Server：数百个开源 MCP Server 覆盖常见工具
- 自建 Server：把你的内部 API 封装成 MCP Server

**SDK**：
- Python: `mcp` 包
- TypeScript: `@modelcontextprotocol/sdk`
- Go、Rust 等语言也有社区 SDK

### MCP 的价值：为什么不是"又一个标准"

```
没有 MCP 时，5 个框架 × 3 个工具 = 15 个适配器

LangChain → 搜索 | 数据库 | 文件
CrewAI   → 搜索 | 数据库 | 文件
AutoGen  → 搜索 | 数据库 | 文件
自建 A   → 搜索 | 数据库 | 文件
自建 B   → 搜索 | 数据库 | 文件

有 MCP 后，3 个 MCP Server × 5 个 MCP Client = 3 个 Server + 5 个 Client

搜索 MCP Server ──→ 5 个 Client 都能用
数据库 MCP Server ──→ 5 个 Client 都能用
文件 MCP Server ──→ 5 个 Client 都能用
```

**核心价值**：N×M 问题变成 N+M 问题。工具开发者只需实现一次 MCP Server，Agent 开发者只需实现一次 MCP Client。

### 在 Claude Desktop 中使用 MCP Server

Claude Desktop 已经内置 MCP 支持，只需在配置文件中添加 Server（路径：`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/你的用户名/Documents"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

重启 Claude Desktop 后，你就可以在对话中让 Claude 读取文件、操作 GitHub——这些能力都是通过 MCP Server 提供的。

### 要点总结

- MCP = USB-C for AI：一个协议连接所有 LLM 客户端和所有工具服务器
- Client-Server 架构：Client（Claude/Cursor/自建 Agent）← MCP 协议 → Server（搜索/DB/文件）
- 三类原语：Tools（模型调用）、Resources（Client 读取并注入上下文）、Prompts（快捷指令）
- MCP vs Function Calling：FC 是 API 层定义，MCP 是协议层标准——一次实现，处处可用
- 价值：N×M 适配问题变成 N+M，工具开发者写一次 Server，Agent 开发者写一次 Client
- 下一节 L06-05 会实战：用 Python SDK 构建并发布你自己的 MCP Server
