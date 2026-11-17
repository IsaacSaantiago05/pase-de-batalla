import { useEffect, useState } from 'react'
import { FieldLabel, Icon, Notice, ProgressBar, SectionTitle } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Period = 'hoy' | 'semana' | 'mes'

type QrCount = {
  generados: number
  utilizados: number
  expirados: number
  cancelados: number
  activos: number
}

type Statistics = {
  negocio_id: number | null
  qr: Record<Period, QrCount>
  // Solo llegan para el administrador general.
  clientes_activos?: Record<Period, number>
  clientes_registrados?: number
}

type Business = { id: number; nombre: string }

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Últimos 7 días' },
  { key: 'mes', label: 'Últimos 30 días' },
]

const QR_STATES: { key: keyof QrCount; label: string; color: string }[] = [
  { key: 'utilizados', label: 'Canjeados', color: '#10b981' },
  { key: 'activos', label: 'Activos', color: '#60a5fa' },
  { key: 'expirados', label: 'Expirados', color: '#f59e0b' },
  { key: 'cancelados', label: 'Cancelados', color: '#ef4444' },
]

const formatNumber = (value: number) => value.toLocaleString('es-MX')

function QrPeriodCard({ label, count }: { label: string; count: QrCount }) {
  const redeemedRate = count.generados > 0 ? Math.round((count.utilizados / count.generados) * 100) : 0

  return (
    <div className="pb-card flex flex-col gap-3 rounded-2xl p-5">
      <p className="font-display text-xs font-bold uppercase tracking-widest text-white/50">{label}</p>
      <div className="flex items-end gap-2">
        <span className="font-mono-game text-4xl font-bold text-white">{formatNumber(count.generados)}</span>
        <span className="pb-1 font-display text-xs font-semibold tracking-wide text-white/40">QR generados</span>
      </div>
      <div>
        <ProgressBar color="#10b981" current={count.utilizados} height={6} max={Math.max(count.generados, 1)} />
        <p className="mt-1.5 text-xs text-white/40">{redeemedRate}% canjeados por clientes</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {QR_STATES.map((state) => (
          <p className="flex items-center justify-between text-sm" key={state.key}>
            <span className="flex items-center gap-2 text-white/60">
              <span className="h-2 w-2 rounded-full" style={{ background: state.color }} />
              {state.label}
            </span>
            <span className="font-mono-game font-bold text-white">{formatNumber(count[state.key])}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

// Estadisticas del panel: QR generados por periodo y, solo para el administrador general, clientes activos.
export function StatisticsPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [businessId, setBusinessId] = useState('')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isGeneral) {
      apiGet<Business[]>('/businesses')
        .then((response) => setBusinesses(listData(response.data)))
        .catch(() => setBusinesses([]))
    }
  }, [isGeneral])

  useEffect(() => {
    const path = isGeneral && businessId ? `/statistics?negocio_id=${businessId}` : '/statistics'

    apiGet<Statistics>(path)
      .then((response) => {
        setError('')
        setStats(response.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar las estadísticas'))
  }, [businessId, isGeneral])

  return (
    <AdminPage title="ESTADÍSTICAS">
      {isGeneral && (
        <div>
          <FieldLabel htmlFor="statistics-business">Negocio</FieldLabel>
          <select className="pb-input" id="statistics-business" onChange={(e) => setBusinessId(e.target.value)} value={businessId}>
            <option value="">Toda la plataforma</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {stats && (
        <>
          <SectionTitle className="text-white/40">Códigos QR generados</SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            {PERIODS.map((period) => (
              <QrPeriodCard count={stats.qr[period.key]} key={period.key} label={period.label} />
            ))}
          </div>

          {stats.clientes_activos && (
            <>
              <SectionTitle className="mt-2 text-white/40">Clientes activos</SectionTitle>
              <div className="pb-card rounded-2xl p-5">
                <div className="grid grid-cols-3 gap-3">
                  {PERIODS.map((period) => (
                    <div key={period.key}>
                      <p className="font-display text-xs font-bold uppercase tracking-widest text-white/50">{period.label}</p>
                      <p className="mt-1 font-mono-game text-3xl font-bold text-white">{formatNumber(stats.clientes_activos?.[period.key] ?? 0)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-white/40">
                  <Icon name="clients" />
                  Clientes que ganaron puntos en el periodo
                  {stats.clientes_registrados !== undefined && ` · ${formatNumber(stats.clientes_registrados)} registrados en total`}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </AdminPage>
  )
}
