import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { clearSession } from '../lib/auth'

type Me = { nombre: string }
type Balance = { saldo_global: number }
type Progress = {
  puntos_actuales: number
  progreso_porcentaje: number
  siguiente_hito_faltante: number
  siguiente_hito_puntos: number | null
}

const SHORTCUTS = [
  { to: '/rewards', title: 'Recompensas', text: 'Canjea tus puntos' },
  { to: '/battle-pass', title: 'Pase de batalla', text: 'Tus rangos y premios' },
  { to: '/island', title: 'Mi isla', text: 'Decora y desbloquea' },
  { to: '/businesses', title: 'Negocios', text: 'Donde ganar puntos' },
  { to: '/redemptions', title: 'Mis canjes', text: 'Estado de tus canjes' },
  { to: '/history', title: 'Historial', text: 'Movimientos de puntos' },
  { to: '/points', title: 'Mis puntos', text: 'Saldo y nivel' },
  { to: '/profile', title: 'Perfil', text: 'Datos y contraseña' },
]

export function HomePage() {
  const [me, setMe] = useState<Me | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)

  useEffect(() => {
    apiGet<Me>('/auth/me').then((response) => setMe(response.data)).catch(() => setMe(null))
    apiGet<Balance>('/points/balance').then((response) => setBalance(response.data.saldo_global)).catch(() => setBalance(null))
    apiGet<Progress>('/battle-pass/progress').then((response) => setProgress(response.data)).catch(() => setProgress(null))
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Bienvenido</p>
          <h1 className="text-2xl font-semibold text-slate-900">{me?.nombre ?? 'Pase de Batalla'}</h1>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => {
            clearSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Saldo para canjear</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{balance ?? '-'} pts</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pase de batalla</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{progress ? `${progress.progreso_porcentaje}%` : '-'}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress?.progreso_porcentaje ?? 0}%` }} />
          </div>
          {progress && progress.siguiente_hito_puntos !== null && (
            <p className="mt-2 text-xs text-slate-500">Te faltan {progress.siguiente_hito_faltante} puntos ganados para el siguiente rango</p>
          )}
        </div>
      </section>

      <Link
        className="block rounded-xl bg-slate-900 p-5 text-center text-white shadow-sm hover:bg-slate-800"
        to="/scan-qr"
      >
        <span className="block text-lg font-semibold">Escanear QR de compra</span>
        <span className="text-sm text-slate-300">Gana puntos con el QR que te muestra el negocio</span>
      </Link>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SHORTCUTS.map((item) => (
          <Link className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400" key={item.to} to={item.to}>
            <span className="block font-semibold text-slate-900">{item.title}</span>
            <span className="text-xs text-slate-500">{item.text}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
