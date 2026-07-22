import { Link } from 'react-router-dom'
import { allProjects, curriculum } from '../data/curriculum'
import { DifficultyBadge, Tag } from '../components/Badges'

const difficultyOrder = { 入门: 0, 进阶: 1, 高级: 2, 专家: 3 } as const

export function ProjectsPage() {
  const projects = [...allProjects].sort(
    (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty],
  )

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-eyebrow">实战项目</span>
        <h1 className="section-title">9 个递进式实战项目</h1>
        <p className="mt-4 text-ink-400">
          每个项目都对应一个学习阶段，从命令行助手一路升级到生产级多 Agent 产品。
          学完即有 9 个可写进简历的代表作。
        </p>
      </div>

      {/* Difficulty legend */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs">
        {(['入门', '进阶', '高级', '专家'] as const).map((d) => (
          <span key={d} className="flex items-center gap-1.5 text-ink-400">
            <DifficultyBadge level={d} />
            阶段标记
          </span>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {projects.map((p, i) => {
          const module = curriculum.modules.find((m) => m.id === p.module)!
          return (
            <div
              key={p.id}
              className="card card-hover group relative overflow-hidden p-6"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-5 transition-opacity group-hover:opacity-10">
                {module.icon}
              </div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-500">
                    项目 {p.id} · 模块 {p.module}
                  </span>
                  <DifficultyBadge level={p.difficulty} />
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <span className="text-2xl">{module.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-ink-50">{p.title}</h3>
                    <p className="mt-1 text-xs text-ink-500">{module.title}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-ink-300">
                  {p.summary}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                      核心交付物
                    </div>
                    <ul className="space-y-1">
                      {p.deliverables.slice(0, 4).map((d, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-1.5 text-xs text-ink-300"
                        >
                          <span className="mt-0.5 text-brand-400">▸</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                      技术栈
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.stack.map((s) => (
                        <Tag key={s}>{s}</Tag>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/curriculum/${p.module}`}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
                >
                  前往所属模块 <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Capstone callout */}
      <div className="mt-12">
        <div className="card relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-ink-900 to-ink-900 p-8 sm:p-10">
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="chip border border-amber-500/40 bg-amber-500/15 text-amber-300">
                🏆 毕业设计
              </span>
              <h2 className="mt-3 text-2xl font-bold text-ink-50">
                P9 · 生产级 Agent 产品
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-300">
                综合全书所学的终极挑战：多 Agent 协作 + MCP 工具 + RAG 记忆 + 评测流水线 +
                全链路可观测 + 安全加固，交付一个可部署的产品。
              </p>
            </div>
            <Link to="/curriculum/9" className="btn-primary shrink-0">
              查看毕业要求
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
