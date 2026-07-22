import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="text-7xl">🧭</div>
      <h1 className="mt-6 text-4xl font-extrabold text-ink-50">404</h1>
      <p className="mt-2 text-ink-400">
        这节课还没写好，或者你走到了课程的边界之外。
      </p>
      <Link to="/" className="btn-primary mt-8">
        回到首页
      </Link>
    </div>
  )
}
