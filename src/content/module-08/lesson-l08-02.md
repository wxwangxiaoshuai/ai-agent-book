## 对话窗口管理：压缩、摘要与滑动窗口

短期记忆就是塞进 prompt 的 `messages` 列表。听起来最简单，却是最先出问题的地方：**对话一长，上下文窗口就满了。** 200K 的窗口聊半小时也撑不住。更隐蔽的是——哪怕没满，对话越长模型越"健忘"，关键信息被稀释。这一节解决"长对话里不丢关键信息"。

### 窗口会满，而且比你想的快

```
对话场景：用户和 Agent 协作改一段代码，反复调试

  轮次1：贴代码 2000 token
  轮次2：Agent 分析 + 用户反馈 1500 token
  轮次3：改一版 2000 token
  ...
  轮次15：累计 35,000 token

  模型上下文窗口 128K → 看起来远没满？
  但实测：超过 ~32K 后，模型对早期内容的遵循度开始下降（Lost in the Middle）
```

两个问题叠加：**硬上限**（窗口满了报错或被截断）和**软衰减**（没满但模型"忘了"中间的内容）。窗口管理要同时对付两者。

### 策略一：固定滑动窗口（最简）

只保留最近 N 轮对话，老的直接丢弃：

```python
class FixedWindowMemory:
    """固定滑动窗口：只保留最近 max_messages 条"""
    def __init__(self, max_messages: int = 10):
        self.max_messages = max_messages
        self.messages = []

    def add(self, message: dict):
        self.messages.append(message)
        # 超出窗口，丢弃最早的非 system 消息
        while len(self.messages) > self.max_messages:
            # system prompt 永远保留，不丢
            if self.messages[0]["role"] != "system":
                self.messages.pop(0)
            else:
                self.messages.pop(1)

    def get_context(self) -> list:
        return list(self.messages)
```

**优点**：实现 5 行，延迟最低、成本可控。
**致命缺陷**：**中段遗忘**。用户在第 1 轮说"我对花生过敏"，到第 11 轮这句话被丢了——Agent 又开始推荐含花生的菜。固定窗口是"最近 N 条"的暴力截断，不管内容重不重要。

### 策略二：滑动窗口 + 摘要压缩

解决中段遗忘的关键：**老消息不直接丢，而是先压缩成摘要再丢**。摘要保留了信息密度，比原文省 token，又比"直接删"保留了关键点。

```
窗口结构：
  ┌─────────────────────────────────────┐
  │ system prompt（永远保留）           │
  ├─────────────────────────────────────┤
  │ 早期对话摘要（压缩后，省 token）     │  ← 老消息压缩成摘要
  ├─────────────────────────────────────┤
  │ 最近 N 轮原文（完整保留）            │  ← 新消息保持原文
  └─────────────────────────────────────┘
```

**实现**：

```python
from openai import OpenAI
client = OpenAI()

class SummarizingWindowMemory:
    """滑动窗口 + 摘要压缩"""
    def __init__(self, max_recent: int = 6, max_summary_tokens: int = 500):
        self.system_prompt = ""
        self.summary = ""              # 早期对话的滚动摘要
        self.recent = []              # 最近几轮原文
        self.max_recent = max_recent
        self.max_summary_tokens = max_summary_tokens

    def set_system(self, prompt: str):
        self.system_prompt = prompt

    def add(self, message: dict):
        self.recent.append(message)
        # 超过窗口，把最老的一对 user/assistant 压进摘要
        while len(self.recent) > self.max_recent:
            old = self.recent.pop(0)
            self.summary = self._summarize(self.summary, old)

    def _summarize(self, existing_summary: str, old_msg: dict) -> str:
        """把老消息融入已有摘要"""
        prompt = (
            "你在为一段长期对话维护摘要。把新消息融入已有摘要，"
            "保留关键事实、决策、用户偏好，删除寒暄和重复内容。"
            f"不超过 {self.max_summary_tokens} token。\n\n"
            f"已有摘要：\n{existing_summary or '（无）'}\n\n"
            f"新消息（{old_msg['role']}）：\n{old_msg['content']}\n\n"
            "输出更新后的摘要："
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}],
            temperature=0, max_tokens=self.max_summary_tokens,
        )
        return resp.choices[0].message.content

    def get_context(self) -> list:
        msgs = []
        if self.system_prompt:
            msgs.append({"role": "system", "content": self.system_prompt})
        if self.summary:
            msgs.append({
                "role": "system",
                "content": f"[对话摘要]\n{self.summary}",
            })
        msgs.extend(self.recent)
        return msgs
```

**关键设计**：摘要用单独的 `system` 消息承载（而非混进 user），这样模型知道这是"背景"而非"当前指令"，优先级清晰。摘要还会**滚动更新**——每压一条就重新 summarize，保持摘要始终反映全部历史。

### 策略三：Token 预算驱动的动态窗口

按消息条数切窗口太粗糙——一条消息可能 10 token，也可能 5000 token。**按 token 预算切才精准**（呼应 M3 的 Token 预算）：

```python
import tiktoken

class TokenBudgetMemory:
    """按 token 预算管理的动态窗口"""
    def __init__(self, budget: int = 16000, reserve_recent: int = 4000):
        self.budget = budget                 # 总 token 预算
        self.reserve_recent = reserve_recent # 给最近原文留的预算
        self.system = ""
        self.summary = ""
        self.recent = []
        self.enc = tiktoken.encoding_for_model("gpt-4o")

    def _count(self, text: str) -> int:
        return len(self.enc.encode(text))

    def add(self, message: dict):
        self.recent.append(message)
        self._compact()

    def _compact(self):
        """当超出预算，压缩最老的消息进摘要"""
        while self._total_tokens() > self.budget and len(self.recent) > 2:
            old = self.recent.pop(0)
            self.summary = self._summarize(self.summary, old)

    def _total_tokens(self) -> int:
        return (self._count(self.system) + self._count(self.summary)
                + sum(self._count(m["content"]) for m in self.recent))
```

**好处**：token 预算可以按模型窗口精确设置（如 GPT-4o-mini 128K → 留 16K 给历史），且**自动触发压缩**——不用猜"几条消息会超"。

### 中段遗忘：不只是"丢了"

中段遗忘有两种，对策不同：

```
类型1：硬性丢失（被窗口截断丢了）
  → 用摘要压缩解决（这一节）

类型2：软性丢失（还在窗口里，但模型"没看见"）
  → Lost in the Middle：模型对中间位置的内容注意力低
  → 对策：把最关键信息放在 prompt 首尾，而非中段
```

**缓解软性丢失的组装顺序**：

```python
def assemble_context(system, summary, recent, retrieved_facts):
    """把最关键信息放在首尾，规避 Lost in the Middle"""
    return [
        {"role": "system", "content": system},
        # 头部：摘要（关键背景）
        {"role": "system", "content": f"[摘要]\n{summary}"} if summary else None,
        # 中段：最近对话原文
        *recent,
        # 尾部：刚检索到的事实（最相关，放最后强化记忆）
        {"role": "system", "content": f"[即时检索]\n{retrieved_facts}"} if retrieved_facts else None,
    ]  # 过滤 None
```

> 经验：把"模型这次最需要关注的"放 prompt 末尾，把"背景"放开头，中间放次重要内容。这是长上下文场景下的实用组装原则。

### 三种策略对比

| 策略 | 实现难度 | token 成本 | 信息保真度 | 适用场景 |
|------|----------|------------|------------|----------|
| 固定滑动窗口 | 极低 | 低 | 差（中段丢失） | 短对话、FAQ |
| 滑动窗口+摘要 | 中 | 中（含摘要 LLM 调用） | 中（摘要有损） | 长对话、个人助手 |
| Token 预算动态 | 中高 | 可控 | 中（自动触发压缩） | 生产级、需精确控本 |
| 全量保留（不压缩） | 低 | 高（线性增长） | 高（但有软衰减） | 短期任务、预算充足 |

**没有银弹**：摘要压缩有损——LLM 摘要可能漏掉它觉得不重要但你认为关键的细节。对于"绝对不能丢"的事实（如用户过敏原），别依赖摘要，**应该提升为长期-语义记忆单独存**（L08-03）。

### 何时该"升级"到长期记忆

窗口管理（短期记忆）有天花板，判断该不该上长期记忆：

- [ ] 对话经常超过窗口预算，摘要后仍漏关键信息 → 上长期记忆
- [ ] 用户跨会话回来，希望 Agent 记住上次的事 → 必须上长期记忆
- [ ] 摘要 LLM 调用成本已经不低，且频繁触发 → 上长期记忆（摊薄成本）
- [ ] 只在单次会话内工作，关了就丢 → 留在短期记忆即可

> 记忆层次不是替代关系，是**叠加关系**：短期窗口管"这次对话"，长期记忆管"跨会话"。L08-02 解决短期，L08-03 接力长期。

### 要点总结

- 长对话两个问题：硬上限（窗口满）+ 软衰减（Lost in the Middle，没满也"忘了中间"）
- 固定滑动窗口最简但有中段遗忘——老消息暴力丢弃，不管重不重要
- 滑动窗口+摘要压缩：老消息压缩成摘要再丢，保留信息密度，规避中段遗忘
- Token 预算动态窗口：按 token 而非条数切，可精确对齐模型窗口，自动触发压缩
- 软性丢失对策：关键信息放 prompt 首尾，背景放头、即时信息放尾
- 摘要有损——绝对不能丢的事实别靠摘要，提升为长期-语义记忆单独存
- 短期窗口有天花板：跨会话、频繁超窗 → 升级到 L08-03 的长期记忆
