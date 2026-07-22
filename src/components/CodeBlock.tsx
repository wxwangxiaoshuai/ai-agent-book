import { useState } from 'react'

interface Token {
  type: 'key' | 'str' | 'num' | 'com' | 'fn' | 'txt'
  value: string
}

// Extremely lightweight tokenizer — good enough for illustrative snippets.
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  // comment
  const commentIdx = line.indexOf('//')
  let work = line
  let trailingComment = ''
  // only treat as comment if not inside a string (simple heuristic: count quotes before)
  if (commentIdx >= 0) {
    const before = line.slice(0, commentIdx)
    const dq = (before.match(/"/g) || []).length
    if (dq % 2 === 0) {
      trailingComment = line.slice(commentIdx)
      work = before
    }
  }
  const regex = /("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(\s*\()|([A-Za-z_]\w*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(work)) !== null) {
    if (m.index > last) tokens.push({ type: 'txt', value: work.slice(last, m.index) })
    if (m[1]) tokens.push({ type: 'str', value: m[1] })
    else if (m[2]) tokens.push({ type: 'num', value: m[2] })
    else if (m[3]) {
      tokens.push({ type: 'fn', value: m[3] })
      tokens.push({ type: 'txt', value: m[4] })
    } else if (m[5]) {
      const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from', 'export', 'class', 'new', 'async', 'await', 'def', 'True', 'False', 'None', 'self']
      tokens.push({ type: keywords.includes(m[5]) ? 'key' : 'txt', value: m[5] })
    }
    last = regex.lastIndex
  }
  if (last < work.length) tokens.push({ type: 'txt', value: work.slice(last) })
  if (trailingComment) tokens.push({ type: 'com', value: trailingComment })
  return tokens
}

export function CodeBlock({
  code,
  title,
  lang = 'ts',
}: {
  code: string
  title?: string
  lang?: string
}) {
  const [copied, setCopied] = useState(false)
  const lines = code.replace(/\n$/, '').split('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950/80">
      <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-500/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </span>
          <span className="ml-2 font-mono text-xs text-ink-400">
            {title || lang}
          </span>
        </div>
        <button
          onClick={copy}
          className="rounded-md px-2 py-1 font-mono text-[11px] text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <pre className="code-block !rounded-none !border-0">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-4 inline-block w-8 shrink-0 select-none text-right text-ink-600">
                {i + 1}
              </span>
              <span className="flex-1">
                {tokenizeLine(line).map((t, j) => (
                  <span key={j} className={`tok-${t.type}`}>
                    {t.value}
                  </span>
                ))}
                {line === '' && ' '}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
