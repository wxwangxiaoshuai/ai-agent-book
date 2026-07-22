import { useState, useMemo } from 'react'

// Simple embedding simulation: map words to pseudo-vectors
function simpleEmbedding(text: string, dims: number = 3): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const vec = new Array(dims).fill(0)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let j = 0; j < word.length; j++) {
      vec[(i * word.length + j) % dims] += word.charCodeAt(j) / 1000
    }
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return vec.map((v) => v / (mag || 1))
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (magA * magB || 1)
}

const DOCUMENTS = [
  '人工智能正在改变软件开发的方式',
  'Python 是 AI 开发中最流行的编程语言',
  '机器学习需要大量的训练数据',
  '软件开发需要良好的工程实践',
  '自然语言处理是 AI 的重要分支',
  '代码审查是软件开发的重要环节',
]

export function EmbeddingExplorer() {
  const [query, setQuery] = useState('AI 开发')
  const [k, setK] = useState(3)

  const queryVec = useMemo(() => simpleEmbedding(query), [query])
  const results = useMemo(() => {
    return DOCUMENTS.map((doc) => ({
      doc,
      score: cosineSimilarity(simpleEmbedding(doc), queryVec),
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
  }, [query, k, queryVec])

  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-semibold text-ink-100">
        Embedding 语义搜索演示
      </h4>
      <p className="mb-4 text-xs text-ink-500">
        输入查询文本，观察向量相似度如何找到语义相关的内容（即使没有相同的关键词）。
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-ink-400">查询</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-200 outline-none transition-colors focus:border-brand-500/50"
          placeholder="输入查询..."
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-ink-400">
          Top-K: {k}
        </label>
        <input
          type="range"
          min="1"
          max={DOCUMENTS.length}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900/60 p-3"
          >
            <span className="shrink-0 font-mono text-xs font-bold text-brand-400">
              #{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-200">{r.doc}</p>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${Math.max(0, r.score * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-ink-400">
                  {(r.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-500">
        这演示了 Embedding 的核心思想：将文本映射到高维向量空间，语义相近的文本向量距离更近。
        实际系统中使用 Embedding 模型（如 text-embedding-3-small）生成高维向量。
      </p>
    </div>
  )
}