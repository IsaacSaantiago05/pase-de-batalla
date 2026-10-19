import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type DayPoint = {
  dia: string
  ventas: number
  ingresos: number
  puntos_otorgados: number
}

type Statistics = {
  periodo_dias: number
  desde: string
  resumen: {
    ventas: number
    ingresos: number
    puntos_otorgados: number
    puntos_canjeados: number
    canjes: number
    clientes_activos: number
    clientes_registrados?: number
    qr: { generados: number; utilizados: number; expirados: number; cancelados: number; activos: number }
  }
  por_dia: DayPoint[]
  top_productos: { nombre: string; unidades: number; ingresos: number; puntos: number }[]
  por_negocio?: { negocio_id: number; nombre: string; activo: boolean; ventas: number; ingresos: number; puntos_otorgados: number }[]
}

type Metric = 'ventas' | 'ingresos' | 'puntos_otorgados'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'ventas', label: 'Ventas' },
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'puntos_otorgados', label: 'Puntos otorgados' },
]

const money = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatMetric = (metric: Metric, value: number) => (metric === 'ingresos' ? money(value) : value.toLocaleString('es-MX'))
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function DailyBars({ series, metric }: { series: DayPoint[]; metric: Metric }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...series.map((point) => point[metric]), 0)
  const labelEvery = Math.ceil(series.length / 8)

  return (
    <div>
      <div className="relative">
        <p className="mb-1 text-xs text-slate-500">Max. {formatMetric(metric, max)}</p>
        <div className="flex h-48 items-end gap-[2px] border-b border-slate-300" role="img" aria-label={`Serie diaria de ${metric}`}>
          {series.map((point, index) => {
            const value = point[metric]
            const height = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0
            return (
              <div
                className="relative flex h-full flex-1 items-end"
                key={point.dia}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={`w-full rounded-t-[4px] ${hover === index ? 'bg-emerald-800' : 'bg-emerald-600'}`}
                  style={{ height: `${height}%` }}
                />
                {hover === index && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
                    {shortDay(point.dia)}: {formatMetric(metric, value)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-slate-500">
        {series.map((point, index) => (
          <span className="flex-1 text-center" key={point.dia}>
            {index % labelEvery === 0 ? shortDay(point.dia) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export function StatisticsPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<Metric>('ventas')
  const [businessId, setBusinessId] = useState('')
  const [businesses, setBusinesses] = useState<{ id: number; nombre: string }[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)
  const [showTable, setShowTable] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isGeneral) {
      apiGet<{ id: number; nombre: string }[]>('/businesses')
        .then((response) => setBusinesses(listData(response.data)))
        .catch(() => setBusinesses([]))
    }
  }, [isGeneral])

  useEffect(() => {
    const query = new URLSearchParams({ dias: String(days) })
    if (isGeneral && businessId) query.set('negocio_id', businessId)

    apiGet<Statistics>(`/statistics?${query.toString()}`)
      .then((response) => {
        setError('')
        setStats(response.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar estadisticas'))
  }, [days, businessId, isGeneral])

  const summary = stats?.resumen
  const scanRate = summary && summary.qr.generados > 0 ? Math.round((summary.qr.utilizados / summary.qr.generados) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Estadisticas</h1>
          <Link className="rounded-md border px-3 py-1 text-sm" to="/dashboard">
            Volver
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          {[7, 30, 90].map((option) => (
            <button
              className={`rounded-md border px-3 py-1 ${days === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
              key={option}
              onClick={() => setDays(option)}
              type="button"
            >
              {option} dias
            </button>
          ))}
          {isGeneral && (
            <select className="rounded-md border border-slate-300 px-2 py-1" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              <option value="">Toda la plataforma</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Ventas" value={summary.ventas.toLocaleString('es-MX')} />
            <StatTile label="Ingresos" value={money(summary.ingresos)} />
            <StatTile label="Puntos otorgados" value={summary.puntos_otorgados.toLocaleString('es-MX')} hint={`${summary.puntos_canjeados.toLocaleString('es-MX')} canjeados`} />
            <StatTile
              label="Clientes activos"
              value={summary.clientes_activos.toLocaleString('es-MX')}
              hint={summary.clientes_registrados !== undefined ? `${summary.clientes_registrados} registrados en total` : undefined}
            />
            <StatTile label="Canjes de recompensas" value={summary.canjes.toLocaleString('es-MX')} />
            <StatTile label="QR escaneados" value={`${scanRate}%`} hint={`${summary.qr.utilizados} de ${summary.qr.generados} generados`} />
            <StatTile label="QR expirados" value={summary.qr.expirados.toLocaleString('es-MX')} hint={`${summary.qr.cancelados} cancelados`} />
            <StatTile label="Periodo" value={`${stats.periodo_dias} dias`} hint={`desde ${shortDay(stats.desde)}`} />
          </div>
        )}
      </div>

      {stats && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{METRICS.find((item) => item.key === metric)?.label} por dia</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {METRICS.map((item) => (
                <button
                  className={`rounded-md border px-3 py-1 ${metric === item.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                  key={item.key}
                  onClick={() => setMetric(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
              <button className="rounded-md border border-slate-300 px-3 py-1" onClick={() => setShowTable((value) => !value)} type="button">
                {showTable ? 'Ver grafica' : 'Ver tabla'}
              </button>
            </div>
          </div>
          {showTable ? (
            <div className="max-h-72 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Dia</th>
                    <th className="p-2">Ventas</th>
                    <th className="p-2">Ingresos</th>
                    <th className="p-2">Puntos otorgados</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.por_dia.map((point) => (
                    <tr className="border-b" key={point.dia}>
                      <td className="p-2">{shortDay(point.dia)}</td>
                      <td className="p-2">{point.ventas}</td>
                      <td className="p-2">{money(point.ingresos)}</td>
                      <td className="p-2">{point.puntos_otorgados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DailyBars metric={metric} series={stats.por_dia} />
          )}
        </div>
      )}

      {stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold">Productos mas vendidos</h2>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Producto</th>
                  <th className="p-2 text-right">Unidades</th>
                  <th className="p-2 text-right">Ingresos</th>
                  <th className="p-2 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_productos.map((product) => (
                  <tr className="border-b" key={product.nombre}>
                    <td className="p-2">{product.nombre}</td>
                    <td className="p-2 text-right">{product.unidades}</td>
                    <td className="p-2 text-right">{money(product.ingresos)}</td>
                    <td className="p-2 text-right">{product.puntos}</td>
                  </tr>
                ))}
                {stats.top_productos.length === 0 && (
                  <tr>
                    <td className="p-2 text-slate-500" colSpan={4}>Sin ventas en el periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {stats.por_negocio && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-semibold">Por negocio</h2>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Negocio</th>
                    <th className="p-2 text-right">Ventas</th>
                    <th className="p-2 text-right">Ingresos</th>
                    <th className="p-2 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.por_negocio.map((business) => (
                    <tr className="border-b" key={business.negocio_id}>
                      <td className="p-2">
                        {business.nombre}
                        {!business.activo && <span className="ml-2 text-xs text-slate-500">(inactivo)</span>}
                      </td>
                      <td className="p-2 text-right">{business.ventas}</td>
                      <td className="p-2 text-right">{money(business.ingresos)}</td>
                      <td className="p-2 text-right">{business.puntos_otorgados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
