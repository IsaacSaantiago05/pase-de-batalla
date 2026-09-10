import { Link } from 'react-router-dom'
import { clearSession } from '../lib/auth'

export function ShellPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => {
            clearSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>
      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          '/home',
          '/island',
          '/battle-pass',
          '/points',
          '/scan-qr',
          '/rewards',
          '/redemptions',
          '/history',
          '/businesses',
          '/profile',
        ].map((route) => (
          <Link className="rounded-md border px-2 py-1" key={route} to={route}>
            {route}
          </Link>
        ))}
      </nav>
      <p className="text-slate-600">Vista funcional inicial para la fase 1-2.</p>
    </div>
  )
}
