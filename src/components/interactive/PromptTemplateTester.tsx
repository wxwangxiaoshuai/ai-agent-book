import { useState } from 'react'

const TEMPLATE = `你是一个{role}。请根据以下信息回答用户问题。

背景信息：
{context}

用户问题：
{question}

请以{style}的方式回答，字数不超过{max_words}字。`

const DEFAULTS: Record<string, string> = {
  role: 'AI 技术专家',
  context: '用户是一位正在学习 AI Agent 开发的软件工程师，已有 Python 和 JavaScript 基础。',
  question: '什么是 LangGraph？它和 LangChain 有什么关系？',
  style: '简洁明了',
  max_words: '200',
}

export function PromptTemplateTester() {
  const [fields, setFields] = useState(DEFAULTS)

  const rendered = TEMPLATE.replace(/\{(\w+)\}/g, (_, key) => fields[key] || `{${key}}`)

  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-semibold text-ink-100">
        Prompt 模板测试器
      </h4>
      <p className="mb-4 text-xs text-ink-500">
        填写模板变量，查看渲染后的 Prompt。这是结构化 Prompt 工程的核心思想。
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {Object.entries(fields).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-ink-400">
                {'{' + key + '}'}
              </label>
              <input
                value={val}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-200 outline-none transition-colors focus:border-brand-500/50"
              />
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-ink-400">渲染结果</div>
          <pre className="rounded-lg border border-ink-700 bg-ink-950/80 p-4 font-mono text-xs leading-relaxed text-ink-200 whitespace-pre-wrap">
            {rendered}
          </pre>
        </div>
      </div>
    </div>
  )
}