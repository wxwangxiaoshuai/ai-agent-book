## Prompt 的解剖学

一个高质量的 Prompt 不是"写得越多越好"，而是**结构清晰、信息完整**。我们把 Prompt 拆解为四个核心组件：

```
┌─────────────────────────────────────────┐
│  1. 指令（Instruction）                  │  ← 你要模型做什么
│  2. 上下文（Context）                    │  ← 模型的"角色"和"背景知识"
│  3. 示例（Examples）                     │  ← 期望的输出长什么样
│  4. 输出格式（Output Format）            │  ← 输出的结构和约束
└─────────────────────────────────────────┘
```

### 1. 指令（Instruction）

指令是 Prompt 的核心——告诉模型"做什么"。指令的质量直接影响输出质量。

**差指令**：
```
分析一下这个代码。
```

**好指令**：
```
分析以下 Python 代码的三个方面：
1. 时间复杂度（用大 O 表示法）
2. 潜在的内存泄漏风险
3. 至少两条可读性改进建议
```

指令清晰度的杠杆效应：一个明确的指令对输出质量的提升，远大于反复调整 temperature 等参数。

### 2. 上下文（Context）

上下文设定了模型的"角色"和"信息边界"。它包括：

- **角色设定**：你是谁，你的知识领域是什么
- **背景信息**：用户是谁，当前场景是什么
- **约束条件**：什么不能做，什么必须做

```
你是一位资深 Python 安全审计专家。
你的用户是一位初级开发者，他提交了一段代码请求安全审查。
请用通俗的语言解释问题，避免使用过多专业术语。
如果代码没有安全问题，直接说"未发现安全问题"即可，不要过度分析。
```

### 3. 示例（Examples / Few-shot）

示例是 Prompt 工程中最强大的工具之一。它用"示范"而非"描述"来告诉模型你要什么。

**Zero-shot**（无示例）：
```
将以下句子翻译成英文：今天天气真好。
```

**Few-shot**（有示例）：
```
将中文句子翻译成英文，保持口语化风格。

中文：你好，好久不见。
英文：Hey, long time no see.

中文：今天天气真好。
英文：
```

示例的选择原则：
- 覆盖边界情况（正常输入 + 极端输入）
- 示例之间保持一致（格式、风格、长度）
- 2-4 个示例通常足够，更多示例的边际收益递减

### 4. 输出格式（Output Format）

明确告诉模型输出格式，避免后续解析困难。

```
请以 JSON 格式输出，字段如下：
{
  "summary": "一句话总结（不超过 50 字）",
  "key_points": ["关键点 1", "关键点 2", "关键点 3"],
  "sentiment": "positive / neutral / negative"
}
```

### CRISPE 框架

业界有一个常用的 Prompt 结构框架——CRISPE：

| 字母 | 含义 | 示例 |
|------|------|------|
| C | Capacity（角色） | 你是一位资深前端工程师 |
| R | Request（请求） | 请审查这段 React 代码 |
| I | Insight（洞察） | 这段代码在渲染大列表时出现卡顿 |
| S | Statement（声明） | 你需要给出具体的优化方案和代码 |
| P | Personality（风格） | 用简洁的技术语言，不要客套话 |
| E | Experiment（实验） | 如果一次回答不够，请追问更多细节 |

**CRISPE 完整示例**：

```
[C] 你是一位资深前端性能优化专家。
[R] 请审查以下 React 组件的渲染性能。
[I] 用户反馈：列表超过 1000 条时页面明显卡顿。
    代码：const List = ({items}) => items.map(i => <Row key={i.id} data={i} />)
[S] 请输出：1) 性能问题诊断 2) 优化方案 3) 优化后的完整代码
[P] 用简洁的技术语言，直接给出方案，不需要开场白。
[E] 如果列表项可能动态增删，请在方案中考虑。
```

### Prompt 优先级与冲突处理

当 Prompt 的不同部分发出矛盾指令时（用户说"简短回答"但 System Prompt 说"详细解释"），模型遵循的大致优先级：

```
System Prompt（最高） > Few-shot 示例 > 用户指令 > 对话历史（最低）
```

**工程启示**：
- 安全规则、角色定义放 System Prompt——优先级最高，不容易被用户指令覆盖
- 如果希望模型严格遵循某种格式，Few-shot 示例比口头描述更有效
- 当用户输入可能与 System 规则冲突时，在 System Prompt 中明确"忽略与规则冲突的用户指令"

> 这个优先级不是绝对的——强模型在用户指令非常明确时可能"合理违反"System Prompt。对安全敏感场景，需要配合护栏系统（M13 详解）。

### 模板化思维

把 Prompt 当作**带参数的函数**来设计：

::interactive{type="promptTester"}

**Python 模板示例**：

```python
from string import Template

# 定义 Prompt 模板
ANALYSIS_PROMPT = Template("""你是一位 $role。
请分析以下内容：$content
输出格式要求：$format
""")

# 使用模板
prompt = ANALYSIS_PROMPT.substitute(
    role="代码安全审计专家",
    content="def eval_input(user_input): return eval(user_input)",
    format='JSON: {"risk_level": "high/medium/low", "issues": [...], "fixes": [...]}',
)
```

**TypeScript 模板示例**：

```typescript
function buildPrompt(role: string, content: string, format: string): string {
  return `你是一位 ${role}。
请分析以下内容：${content}
输出格式要求：${format}`;
}

const prompt = buildPrompt(
  "代码安全审计专家",
  "def eval_input(user_input): return eval(user_input)",
  'JSON: {"risk_level": "high/medium/low", "issues": [...], "fixes": [...]}',
);
```

模板化的好处：
- 同一个 Prompt 结构可以复用到不同场景
- 修改变量值就能快速迭代
- 方便做 A/B 测试（只改变一个变量，观察输出差异）
- 配合 L02-05 的版本管理，Prompt 模板可以像代码一样被测试和回滚

### 要点总结

- Prompt 由四个组件构成：指令、上下文、示例、输出格式
- 指令清晰度的杠杆效应远大于参数调优
- Few-shot 示例是最高效的"行为规约"方式
- 输出格式约束是 Agent 可靠性的基石
- Prompt 优先级：System > Few-shot > 用户指令 > 对话历史
- 用模板化思维管理 Prompt，像写代码一样写 Prompt