## 模型选型框架

选模型不能只看 benchmark 分数。你需要从四个维度综合评估：

| 维度 | 关键问题 | 典型指标 |
|------|----------|----------|
| 能力 | 模型能完成我的任务吗？ | 准确率、推理能力、工具调用 |
| 成本 | 用得起吗？ | 每百万 token 价格 |
| 延迟 | 用户能等吗？ | 首 token 时间、总生成时间 |
| 隐私 | 数据能交给它吗？ | 是否支持私有部署、数据协议 |

### 主流模型速览（2025-2026）

| 模型 | 厂商 | 特点 | 推荐场景 |
|------|------|------|----------|
| Claude Opus 4 | Anthropic | 最强推理，200K 窗口 | 复杂 Agent、长文档分析 |
| Claude Sonnet 5 | Anthropic | 性价比最优，200K 窗口 | 日常 Agent 主力 |
| GPT-4o | OpenAI | 多模态，生态成熟 | 需要图像理解的任务 |
| GPT-4o-mini | OpenAI | 极低成本，速度快 | 简单任务、分类、路由 |
| Gemini 2.5 Pro | Google | 1M 上下文窗口 | 超长文档处理 |
| DeepSeek V3 | 深度求索 | 开源，性价比高 | 中文场景、私有部署 |
| Qwen 2.5 | 阿里 | 开源，中文优化 | 中文场景、私有部署 |
| Llama 4 | Meta | 开源生态最大 | 私有部署、微调 |

### 成本估算实战

Token 计费公式：

```
总成本 = (输入 token 数 × 输入单价) + (输出 token 数 × 输出单价)
```

**示例：一个日常 Agent 的月度成本估算**

假设你的 Agent 每天处理 100 次对话，每次平均：
- 输入 2000 tokens（系统提示词 + 对话历史 + 工具结果）
- 输出 500 tokens（模型回复 + 工具调用）

```
每日 token 消耗：
  输入: 100 × 2000 = 200,000 tokens
  输出: 100 × 500 = 50,000 tokens

月消耗（30天）：
  输入: 6,000,000 tokens
  输出: 1,500,000 tokens

使用 Claude Sonnet 5（$3/M 输入，$15/M 输出）：
  = (6 × $3) + (1.5 × $15)
  = $18 + $22.5
  = $40.5/月
```

> 这只是模型调用成本。实际 Agent 还要加上搜索 API、数据库、服务器等成本。

### 模型路由（Model Routing）

不要把所有请求都发给同一个模型。一个简单的路由策略：

```
if 任务 == "简单分类 / 关键词提取 / 格式校验":
    → GPT-4o-mini（成本 $0.15/M 输入）
elif 任务 == "常规对话 / 文档问答":
    → Claude Sonnet 5（成本 $3/M 输入）
elif 任务 == "复杂推理 / 多步骤 Agent / 长文档分析":
    → Claude Opus 4（成本 $15/M 输入）
```

**工程实现**：可以用一个轻量模型做"任务分类"，然后根据分类结果路由到不同模型。

```python
def route_task(user_input: str) -> str:
    """简单路由：根据关键词和复杂度选择模型"""
    if len(user_input) < 50 and not any(kw in user_input for kw in ["分析", "总结", "推理"]):
        return "gpt-4o-mini"
    elif any(kw in user_input for kw in ["代码", "debug", "架构", "设计"]):
        return "claude-opus-4"
    return "claude-sonnet-5"
```

### 选型决策树

```
开始
├─ 需要看图片？ → GPT-4o / Gemini
├─ 超长文档（>100K tokens）？ → Gemini 2.5 Pro / Claude（200K）
├─ 中文场景为主？ → DeepSeek / Qwen / Claude
├─ 需要私有部署？ → DeepSeek / Qwen / Llama
├─ 预算有限？ → GPT-4o-mini / DeepSeek
├─ 复杂 Agent 推理？ → Claude Opus 4
└─ 默认选择 → Claude Sonnet 5（性价比最优）
```

### 要点总结

- 选型从能力、成本、延迟、隐私四个维度评估
- 成本估算要算"输入+输出"的总 token 消耗
- 模型路由是降本增效的关键手段
- 默认选 Claude Sonnet 5，需要时升级到 Opus 4 或降级到 mini 模型
- 关注开源模型进展，它们在某些场景下性价比极高