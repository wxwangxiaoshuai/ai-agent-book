## 全能工具箱 Agent + 自制 MCP Server

P5 的 ReAct Agent 只有搜索工具。P6 给它装上全套装备——搜索、代码执行、数据库查询、文件操作——然后把其中一组能力封装成 MCP Server 发布，让 Claude Desktop 直接接入。

### 项目目标

构建一个多工具 Agent + 可发布的 MCP Server：
- 多工具 Agent：搜索、代码执行、SQLite 查询、文件读写，支持并行调用
- 自制 MCP Server：把数据库查询能力封装成独立 MCP Server
- 工具调用追踪：每次调用记录步骤、参数、结果、耗时
- Claude Desktop 接入演示：MCP Server 可直接在 Claude Desktop 中使用

### 验收标准

- [ ] Agent 支持 4+ 种工具，能根据问题自主选择
- [ ] 支持并行工具调用（如同时查天气和时间）
- [ ] 代码执行工具有超时保护（10 秒）
- [ ] SQLite 工具支持建表、插入、查询
- [ ] 文件工具支持读写，有路径限制（不能读 /etc/passwd）
- [ ] MCP Server 可独立运行，提供至少 2 个 Tools + 1 个 Resource
- [ ] MCP Server 可接入 Claude Desktop
- [ ] 工具调用追踪面板显示完整调用链
- [ ] API Key 通过 `.env` 管理

### 实施步骤

**Step 1：环境准备**

```bash
pip install openai python-dotenv sqlite3 mcp
```

**Step 2：实现四类工具**

```python
import json, os, sqlite3, subprocess, time, hashlib
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# --- 安全限制 ---
ALLOWED_FILE_DIR = Path("./workspace").resolve()
ALLOWED_FILE_DIR.mkdir(exist_ok=True)

# 1. 搜索工具
def search_web(query: str) -> str:
    """搜索互联网获取信息"""
    mock = {"react": "ReAct 是推理+行动的 Agent 范式", "python": "Python 是一种通用编程语言"}
    for k, v in mock.items():
        if k in query.lower():
            return v
    return f"搜索 '{query}' 无结果。建议换个关键词。"

# 2. 代码执行工具（带超时）
def execute_code(code: str) -> str:
    """执行 Python 代码，10 秒超时"""
    try:
        result = subprocess.run(
            ["python3", "-c", code],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            return result.stdout[:2000] or "(无输出)"
        return f"错误: {result.stderr[:500]}"
    except subprocess.TimeoutExpired:
        return "错误: 代码执行超时（10秒）"

# 3. SQLite 查询工具
DB_PATH = "./workspace/agent.db"
def query_db(sql: str) -> str:
    """执行 SQL 查询（仅 SELECT）"""
    sql_stripped = sql.strip().upper()
    if not sql_stripped.startswith("SELECT") and not sql_stripped.startswith("PRAGMA"):
        return "错误: 仅支持 SELECT 查询。不允许修改数据。"
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute(sql)
        rows = cursor.fetchall()
        columns = [d[0] for d in cursor.description]
        conn.close()
        result = [dict(zip(columns, row)) for row in rows]
        return json.dumps(result[:20], ensure_ascii=False)  # 最多 20 行
    except Exception as e:
        return f"SQL 错误: {e}"

# 4. 文件操作工具
def read_file(path: str) -> str:
    """读取工作区内的文件"""
    full_path = (ALLOWED_FILE_DIR / path).resolve()
    if not str(full_path).startswith(str(ALLOWED_FILE_DIR)):
        return f"错误: 只能读取 {ALLOWED_FILE_DIR} 目录下的文件"
    if not full_path.exists():
        return f"错误: 文件 '{path}' 不存在"
    return full_path.read_text()[:2000]

def write_file(path: str, content: str) -> str:
    """写入工作区内的文件"""
    full_path = (ALLOWED_FILE_DIR / path).resolve()
    if not str(full_path).startswith(str(ALLOWED_FILE_DIR)):
        return f"错误: 只能写入 {ALLOWED_FILE_DIR} 目录下的文件"
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content)
    return f"已写入 {len(content)} 字符到 {path}"

# --- 工具注册 ---
TOOL_MAP = {
    "search_web": search_web,
    "execute_code": execute_code,
    "query_db": query_db,
    "read_file": read_file,
    "write_file": write_file,
}

TOOLS_SCHEMA = [
    {"type": "function", "function": {
        "name": "search_web", "description": "搜索互联网获取信息。适用：查询概念、技术、新闻。",
        "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "搜索关键词"}}, "required": ["query"]}}},
    {"type": "function", "function": {
        "name": "execute_code", "description": "执行 Python 代码。适用：数学计算、数据处理。10秒超时。",
        "parameters": {"type": "object", "properties": {"code": {"type": "string", "description": "Python 代码"}}, "required": ["code"]}}},
    {"type": "function", "function": {
        "name": "query_db", "description": "查询 SQLite 数据库（仅 SELECT）。适用：查询已存储的结构化数据。",
        "parameters": {"type": "object", "properties": {"sql": {"type": "string", "description": "SELECT 查询语句"}}, "required": ["sql"]}}},
    {"type": "function", "function": {
        "name": "read_file", "description": "读取工作区文件。适用：查看之前保存的文件。",
        "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "文件路径（相对工作区）"}}, "required": ["path"]}}},
    {"type": "function", "function": {
        "name": "write_file", "description": "写入工作区文件。适用：保存报告、笔记。",
        "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "文件路径"}, "content": {"type": "string", "description": "文件内容"}}, "required": ["path", "content"]}}},
]
```

**Step 3：实现带追踪的并行 Agent**

```python
import concurrent.futures

class ToolboxAgent:
    """多工具 Agent，支持并行调用和追踪"""

    def __init__(self, max_steps: int = 10):
        self.max_steps = max_steps
        self.traces = []

    def run(self, question: str) -> str:
        messages = [{"role": "user", "content": question}]

        for step in range(self.max_steps):
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=TOOLS_SCHEMA,
                temperature=0,
            )
            msg = response.choices[0].message

            if not msg.tool_calls:
                self._print_traces()
                return msg.content

            messages.append(msg)

            # 并行执行工具
            results = self._execute_parallel(msg.tool_calls)
            for tool_call, result in zip(msg.tool_calls, results):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result),
                })

        self._print_traces()
        return "达到最大步数限制。"

    def _execute_parallel(self, tool_calls: list) -> list:
        results = [None] * len(tool_calls)

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = {}
            for i, tc in enumerate(tool_calls):
                fn_name = tc.function.name
                fn_args = json.loads(tc.function.arguments)
                start = time.time()

                if fn_name in TOOL_MAP:
                    future = executor.submit(TOOL_MAP[fn_name], **fn_args)
                    futures[future] = (i, fn_name, fn_args, start)
                else:
                    results[i] = f"错误: 未知工具 '{fn_name}'"

            for future in concurrent.futures.as_completed(futures):
                i, fn_name, fn_args, start = futures[future]
                duration = (time.time() - start) * 1000
                try:
                    result = future.result(timeout=15)
                    results[i] = result
                    self.traces.append({"step": len(self.traces)+1, "tool": fn_name, "args": fn_args, "result": str(result)[:100], "ms": round(duration)})
                except Exception as e:
                    results[i] = f"错误: {e}"
                    self.traces.append({"step": len(self.traces)+1, "tool": fn_name, "args": fn_args, "error": str(e), "ms": round(duration)})

        return results

    def _print_traces(self):
        print("\n--- 工具调用追踪 ---")
        for t in self.traces:
            status = "✓" if "error" not in t else "✗"
            print(f"  [{t['step']}] {status} {t['tool']}({t.get('args', {})}) → {t.get('result', t.get('error', ''))[:80]} ({t['ms']}ms)")
```

**Step 4：构建 MCP Server**

```python
# db_mcp_server.py — 把数据库查询封装成 MCP Server
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, Resource, TextContent
import sqlite3, json, asyncio

server = Server("db-tools")

@server.list_tools()
async def list_tools():
    return [
        Tool(name="query_db",
             description="查询 SQLite 数据库（仅 SELECT）",
             inputSchema={"type": "object",
                          "properties": {"sql": {"type": "string", "description": "SELECT 语句"}},
                          "required": ["sql"]}),
        Tool(name="list_tables",
             description="列出数据库中的所有表",
             inputSchema={"type": "object", "properties": {}}),
    ]

@server.call_tool()
async def call_tool(name, arguments):
    conn = sqlite3.connect("./workspace/agent.db")
    if name == "query_db":
        rows = conn.execute(arguments["sql"]).fetchall()
        cols = [d[0] for d in conn.execute(arguments["sql"]).description]
        result = [dict(zip(cols, r)) for r in rows]
        return [TextContent(type="text", text=json.dumps(result[:20], ensure_ascii=False))]
    elif name == "list_tables":
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        return [TextContent(type="text", text=f"数据库表: {[r[0] for r in rows]}")]
    return [TextContent(type="text", text=f"未知工具: {name}")]

@server.list_resources()
async def list_resources():
    return [Resource(uri="db://schema", name="数据库 Schema", description="所有表结构", mimeType="text/plain")]

@server.read_resource()
async def read_resource(uri):
    if uri == "db://schema":
        conn = sqlite3.connect("./workspace/agent.db")
        tables = conn.execute("SELECT sql FROM sqlite_master WHERE type='table'").fetchall()
        return "\n\n".join(t[0] for t in tables)
    raise ValueError(f"未知资源: {uri}")

async def main():
    async with stdio_server() as (r, w):
        await server.run(r, w, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

**Step 5：初始化测试数据 + 运行**

```python
# 初始化数据库
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)")
    conn.execute("INSERT OR REPLACE INTO users VALUES (1, '张三', 28), (2, '李四', 35), (3, '王五', 22)")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    agent = ToolboxAgent(max_steps=8)

    # 测试 1：多工具并行
    print("=== 测试 1: 多工具并行 ===")
    print(agent.run("帮我查一下数据库里有哪些用户，同时算一下 123 * 456 等于多少"))

    # 测试 2：搜索 + 保存
    print("\n=== 测试 2: 搜索 + 保存 ===")
    print(agent.run("搜索什么是 ReAct，然后把搜索结果保存到 react_notes.txt 文件中"))

    # 测试 3：代码执行
    print("\n=== 测试 3: 代码执行 ===")
    print(agent.run("用 Python 写一个函数计算斐波那契数列前 10 项，并运行它"))
```

### 验收测试

```python
# tests/test_toolbox_agent.py
import pytest
from src.agent import ToolboxAgent, TOOL_MAP, search_web, execute_code, query_db, read_file, write_file
import sqlite3, os

class TestTools:
    def test_search_web(self):
        result = search_web("react")
        assert "ReAct" in result

    def test_execute_code_success(self):
        result = execute_code("print(2+2)")
        assert "4" in result

    def test_execute_code_timeout(self):
        result = execute_code("import time; time.sleep(20)")
        assert "超时" in result

    def test_execute_code_error(self):
        result = execute_code("1/0")
        assert "错误" in result

    def test_query_db_select_only(self):
        result = query_db("DELETE FROM users WHERE id=1")
        assert "错误" in result or "不允许" in result

    def test_file_read_safety(self):
        result = read_file("../../../etc/passwd")
        assert "错误" in result

    def test_file_write_and_read(self):
        write_file("test.txt", "hello world")
        assert "hello world" in read_file("test.txt")
```

### 进阶挑战

1. **接入真实搜索**：用 Tavily/SerpAPI 替代模拟搜索
2. **Docker 沙箱**：代码执行改用 Docker 隔离（参考 M9）
3. **MCP Server 发布**：发布到 PyPI + 提交到 MCP 目录
4. **Web 界面**：用 Gradio 做一个聊天界面 + 工具调用可视化
5. **权限控制**：不同用户可用不同工具子集

### 要点回顾

- 多工具 Agent = Function Calling + 并行执行 + 工具注册表
- 四类核心工具：搜索（信息）、代码执行（计算）、数据库（结构化数据）、文件（持久化）
- 安全三件套：代码超时、SQL 只读、文件路径限制
- MCP Server 把工具能力独立化——一次实现，Claude Desktop / Cursor / 任何 MCP 客户端都能用
- 工具调用追踪是调试的基础——步骤号 + 工具名 + 参数 + 结果 + 耗时

### 下一步

完成 P6 后，你的 Agent 已经有了"手"（工具）和"眼"（追踪）。P7「Agent 弹性框架」会给它穿上"盔甲"——重试、熔断、降级、断点恢复，让 Agent 从"能跑"变成"可靠"。
