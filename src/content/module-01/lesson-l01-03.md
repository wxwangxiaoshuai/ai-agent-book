## 动手调用 LLM API

我们同时用 Python 和 TypeScript 调通第一个 LLM API 调用。目标是跑通**同步调用**和**流式调用**两种模式，并建立一个最小的命令行聊天程序。

### 环境准备

**Python 环境**：

```bash
pip install openai anthropic
```

**TypeScript 环境**：

```bash
npm install openai @anthropic-ai/sdk
# 或
pnpm add openai @anthropic-ai/sdk
```

**API Key 管理**：永远不要把 API Key 硬编码到代码里。使用环境变量：

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Python：同步调用

```python
from openai import OpenAI

client = OpenAI()  # 自动读取 OPENAI_API_KEY

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一个 AI 技术助手。"},
        {"role": "user", "content": "用一句话介绍什么是 Agent。"},
    ],
    temperature=0.7,
    max_tokens=200,
)

print(response.choices[0].message.content)
```

### Python：流式调用

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "写一首关于 AI 的五言绝句。"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()  # 最后换行
```

### TypeScript：同步调用

```typescript
import OpenAI from "openai";

const client = new OpenAI(); // 自动读取 OPENAI_API_KEY

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "你是一个 AI 技术助手。" },
    { role: "user", content: "用一句话介绍什么是 Agent。" },
  ],
  temperature: 0.7,
  max_tokens: 200,
});

console.log(response.choices[0].message.content);
```

### TypeScript：流式调用

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "写一首关于 AI 的五言绝句。" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
console.log();
```

### 最小命令行聊天程序（Python）

```python
import os
from openai import OpenAI

client = OpenAI()

SYSTEM_PROMPT = "你是一个友好的 AI 助手，简洁地回答用户问题。"

def chat():
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    print("AI 聊天助手已启动（输入 quit 退出）")
    
    while True:
        user_input = input("\n你: ")
        if user_input.lower() == "quit":
            print("再见！")
            break
        
        messages.append({"role": "user", "content": user_input})
        
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,
        )
        
        print("AI: ", end="", flush=True)
        reply = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                print(text, end="", flush=True)
                reply += text
        print()
        
        messages.append({"role": "assistant", "content": reply})

if __name__ == "__main__":
    chat()
```

### 速率限制与重试

API 调用最常见的两类错误是**速率限制（429）**和**服务端错误（5xx）**。生产环境必须处理：

```python
import time
from openai import OpenAI, RateLimitError, APIError

def call_with_retry(client, max_retries=3, base_delay=1):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Hello"}],
            )
        except RateLimitError:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)  # 指数退避
                print(f"速率限制，{delay}s 后重试...")
                time.sleep(delay)
            else:
                raise
        except APIError as e:
            if e.status_code >= 500:
                if attempt < max_retries - 1:
                    time.sleep(base_delay)
                else:
                    raise
            else:
                raise
```

### 要点总结

- 同步调用适合简单场景，流式调用适合需要"打字效果"的交互
- API Key 必须用环境变量管理，永远不硬编码
- 生产环境必须处理速率限制和服务端错误
- 指数退避是标准的重试策略
- 从命令行聊天程序开始，这是后续 Agent 开发的起点