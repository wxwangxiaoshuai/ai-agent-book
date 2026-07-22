import { useState } from 'react'

// Simple tokenizer that simulates common LLM tokenization patterns
function tokenize(text: string): string[] {
  if (!text.trim()) return []
  const tokens: string[] = []
  // Split on word boundaries, punctuation, and whitespace
  const regex = /\s+|(?=[.,!?;:(){}[\]"'])|(?<=[.,!?;:(){}[\]"'])/g
  const parts = text.split(regex).filter(Boolean)
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      // Whitespace is usually attached to preceding token
      if (tokens.length > 0) tokens[tokens.length - 1] += part
      continue
    }
    // Common subword splits for demo
    if (part.length > 6) {
      const subwords = splitIntoSubwords(part)
      tokens.push(...subwords)
    } else {
      tokens.push(part)
    }
  }
  return tokens
}

function splitIntoSubwords(word: string): string[] {
  const result: string[] = []
  const common = ['ing', 'tion', 'able', 'ment', 'ness', 'ize', 'er', 'ed', 'ly', 'ous', 'ive', 'al', 'ent']
  let remaining = word
  while (remaining.length > 0) {
    let found = false
    for (const suffix of common) {
      if (remaining.endsWith(suffix) && remaining.length > suffix.length + 2) {
        result.unshift('##' + suffix)
        remaining = remaining.slice(0, -suffix.length)
        found = true
        break
      }
    }
    if (!found) {
      result.unshift(remaining)
      break
    }
  }
  return result.length > 1 ? result : [word]
}

const SAMPLES = [
  '人工智能正在改变世界。',
  'The quick brown fox jumps over the lazy dog.',
  'Tokenization is the first step in LLM processing.',
  '大语言模型通过分词器将文本转换为数字ID。',
  'def hello_world():\n    print("Hello, Agent!")',
]

export function TokenizerDemo() {
  const [text, setText] = useState(SAMPLES[0])
  const tokens = tokenize(text)

  const colors = [
    'bg-brand-500/20 text-brand-300 border-brand-500/30',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'bg-rose-500/20 text-rose-300 border-rose-500/30',
  ]

  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-semibold text-ink-100">
        Token 分词演示
      </h4>
      <div className="mb-3 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              text === s
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'bg-ink-800/50 text-ink-400 border border-ink-700 hover:text-ink-200'
            }`}
          >
            {s.length > 20 ? s.slice(0, 20) + '...' : s}
          </button>
        ))}
      </div>
      <div className="mb-3 rounded-lg bg-ink-950/60 p-3">
        <p className="text-sm text-ink-200">{text}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-500 mb-2">
        <span>共 {tokens.length} 个 token</span>
        <span>字符数: {text.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((t, i) => (
          <span
            key={i}
            className={`rounded-md border px-2 py-1 font-mono text-xs ${
              colors[i % colors.length]
            }`}
            title={`Token #${i + 1}`}
          >
            {t}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">
        每个色块代表一个 token。注意观察中英文分词方式的差异：中文按字/词切分，英文按子词切分。
      </p>
    </div>
  )
}