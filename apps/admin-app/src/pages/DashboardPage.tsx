import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { clearAdminSession, getAdminSession } from '../lib/auth'

type Me = { nombre: string }
type Summary = {
  resumen: { ventas: number; ingresos: number; puntos_otorgados: number; clientes_activos: number }
}
type Shortcut = { to: string; title: string; text: string; ready: boolean }

const BUSINESS: Shortcut[] = [
  { to: '/sales', title: 'Nueva venta', text: 'Registra la venta y genera el QR', ready: true },
  { to: '/products', title: 'Productos', text: 'Catalogo con precio y puntos', ready: true },
  { to: '/rewards', title: 'Recompensas', text: 'Premios y stock', ready: true },
  { to: '/redemptions', title: 'Canjes', text: 'Confirmar y entregar', ready: true },
  { to: '/clients', title: 'Clientes', text: 'Visitas y puntos', ready: true },
  { to: '/qr', title: 'Codigos QR', text: 'Historial de QR', ready: true },
  { to: '/statistics', title: 'Estadisticas', text: 'Ventas e ingresos', ready: true },
  { to: '/points', title: 'Movimientos', text: 'Historial de puntos', ready: true },
  { to: '/business', title: 'Mi negocio', text: 'Datos del negocio', ready: false },
  { to: '/history', title: 'Historial', text: 'Operaciones', ready: false },
]

const PLATFORM: Shortcut[] = [
  { to: '/administrators', title: 'Administradores', text: 'Altas y estado', ready: true },
  { to: '/adjustments', title: 'Ajustes de puntos', text: 'Con motivo obligatorio', ready: true },
  { to: '/users', title: 'Usuarios', text: 'Clientes y estados', ready: false },
  { to: '/businesses', title: 'Negocios', text: 'Alta y estado', ready: false },
  { to: '/levels', title: 'Niveles', text: 'Rangos de puntos', ready: false },
  { to: '/island-elements', title: 'Elementos de isla', text: 'Catalogo de la isla', ready: false },
  { to: '/point-rules', title: 'Reglas de puntos', text: 'Por monto', ready: false },
]

const money = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) =>
        item.ready ? (
          <Link className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400" key={item.to} to={item.to}>
            <span className="block font-semibold text-slate-900">{item.title}</span>
            <span className="text-xs text-slate-500">{item.text}</span>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4" key={item.to}>
            <span className="block font-semibold text-slate-400">{item.title}</span>
            <span className="text-xs text-slate-400">En construccion</span>
          </div>
        ),
      )}
    </div>
  )
}

export function DashboardPage() {
  const role = getAdminSession()?.role
  const isGeneral = role === 'ADMINISTRADOR_GENERAL'
  const [me, setMe] = useState<Me | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    apiGet<Me>('/auth/me').then((response) => setMe(response.data)).catch(() => setMe(null))
    apiGet<Summary>('/statistics?dias=7').then((response) => setSummary(response.data)).catch(() => setSummary(null))
  }, [])

  const tiles = summary
    ? [
        { label: 'Ventas (7 dias)', value: summary.resumen.ventas.toLocaleString('es-MX') },
        { label: 'Ingresos (7 dias)', value: money(summary.resumen.ingresos) },
        { label: 'Puntos otorgados', value: summary.resumen.puntos_otorgados.toLocaleString('es-MX') },
        { label: 'Clientes activos', value: summary.resumen.clientes_activos.toLocaleString('es-MX') },
      ]
    : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{isGeneral ? 'Administrador general' : 'Administrador de negocio'}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{me?.nombre ?? 'Panel'}</h1>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => {
            clearAdminSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>

      {tiles.length > 0 && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={tile.label}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{tile.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{isGeneral ? 'Operacion de negocios' : 'Mi negocio'}</h2>
        <ShortcutGrid items={isGeneral ? BUSINESS.filter((item) => item.to !== '/sales') : BUSINESS} />
      </section>

      {isGeneral && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Plataforma</h2>
          <ShortcutGrid items={PLATFORM} />
        </section>
      )}
    </div>
  )
}
