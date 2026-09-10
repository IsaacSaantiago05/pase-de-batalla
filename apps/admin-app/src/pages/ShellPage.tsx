import { Link } from 'react-router-dom'
import { clearAdminSession, getAdminSession } from '../lib/auth'

export function ShellPage({ title }: { title: string }) {
  const role = getAdminSession()?.role
  const common = ['/dashboard', '/business', '/qr', '/points', '/rewards', '/redemptions', '/history']
  const general = ['/users', '/businesses', '/administrators', '/levels', '/island-elements', '/point-rules', '/statistics']

  return (
    <div className="mx-auto max-w-5xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => {
            clearAdminSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>
      <p className="text-sm text-slate-600">Rol activo: {role}</p>
      <nav className="flex flex-wrap gap-2 text-sm">
        {common.map((route) => (
          <Link className="rounded-md border px-2 py-1" key={route} to={route}>
            {route}
          </Link>
        ))}
        {role === 'ADMINISTRADOR_GENERAL' &&
          general.map((route) => (
            <Link className="rounded-md border px-2 py-1" key={route} to={route}>
              {route}
            </Link>
          ))}
      </nav>
      <p className="text-slate-600">Base funcional administrativa para la fase 1-2.</p>
    </div>
  )
}
