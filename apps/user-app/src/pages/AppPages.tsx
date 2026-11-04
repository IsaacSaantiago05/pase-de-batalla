import { clearSession } from '../lib/auth'
import { AppNav } from '../components/AppNav'

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
      <AppNav />
      <p className="text-slate-600">Vista funcional inicial para la fase 1-2.</p>
    </div>
  )
}
