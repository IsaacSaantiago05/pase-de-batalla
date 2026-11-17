import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, EmptyState, Icon, Notice, ScreenHeader, StatusChip, formatDate, formatPoints } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, listData } from '../lib/api'

type Reward = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  cantidad_disponible: number
  estado: boolean
}

type RewardListPayload = {
  data: Reward[]
}

type Redemption = {
  id: number
  recompensa_nombre: string | null
  puntos_utilizados: number
  estado: string
  fecha: string
}

type RedemptionListPayload = {
  data: Redemption[]
}

export function RewardsPage() {
  const goBack = useGoBack()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<RewardListPayload>('/rewards')
      .then((response) => setRewards(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar recompensas'))
    apiGet<{ saldo_global: number }>('/points/balance').then((response) => setBalance(response.data.saldo_global)).catch(() => setBalance(null))
  }, [])

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="RECOMPENSAS" />

      <div className="mb-3 flex flex-wrap items-center gap-2 px-5">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono-game text-sm font-bold"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
        >
          <Icon name="pointsSolid" />
          {balance === null ? '-' : formatPoints(balance)} disponibles
        </div>
        <Link className="ml-auto text-xs font-semibold" style={{ color: '#f59e0b' }} to="/redemptions">
          Mis canjes
        </Link>
      </div>

      <div className="px-5 pb-6">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-3 md:grid-cols-2">
          {rewards.map((reward) => {
            const affordable = balance !== null && balance >= reward.puntos_requeridos
            const exhausted = reward.cantidad_disponible <= 0
            const content = (
              <>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Icon color={exhausted ? '#6b7280' : undefined} name="reward" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold text-white">{reward.nombre}</p>
                  <p className="text-xs text-white/40">{reward.negocio_nombre ?? `Negocio #${reward.negocio_id}`}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 font-mono-game text-xs font-bold"
                      style={{ color: affordable ? '#fcd34d' : '#9ca3af', background: affordable ? 'rgba(245,158,11,0.15)' : 'rgba(156,163,175,0.1)' }}
                    >
                      <Icon className="mr-1" color="currentColor" name="pointsSolid" />
                      {formatPoints(reward.puntos_requeridos)}
                    </span>
                    <span className="text-xs text-white/30">{exhausted ? 'Agotado' : `${reward.cantidad_disponible} disponibles`}</span>
                  </div>
                </div>
                {exhausted ? (
                  <span className="shrink-0 rounded-lg px-2 py-1 font-display text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    AGOTADO
                  </span>
                ) : (
                  <ChevronRight />
                )}
              </>
            )
            const style = {
              background: 'linear-gradient(135deg, #1a2235, #111827)',
              border: `1px solid ${exhausted ? 'rgba(239,68,68,0.2)' : affordable ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)'}`,
              opacity: exhausted ? 0.6 : 1,
            }

            return exhausted ? (
              <div className="flex items-center gap-4 rounded-2xl p-4" key={reward.id} style={style}>
                {content}
              </div>
            ) : (
              <Link className="flex items-center gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.98]" key={reward.id} state={{ reward }} style={style} to={`/rewards/${reward.id}`}>
                {content}
              </Link>
            )
          })}
        </div>
        {rewards.length === 0 && !error && <EmptyState icon="reward" text="Los negocios aún no publican recompensas." title="Sin recompensas" />}
      </div>
    </Page>
  )
}

const statusIcon: Record<string, IconName> = { COMPLETADO: 'check', CONFIRMADO: 'check', PENDIENTE: 'pending', CANCELADO: 'close' }
const statusColor: Record<string, string> = { COMPLETADO: '#10b981', CONFIRMADO: '#60a5fa', PENDIENTE: '#f59e0b', CANCELADO: '#ef4444' }

export function RedemptionsPage() {
  const goBack = useGoBack()
  const [rows, setRows] = useState<Redemption[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<RedemptionListPayload>('/redemptions/my')
      .then((response) => setRows(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar tus canjes'))
  }, [])

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="MIS CANJES" />
      <div className="px-5 pb-6">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const color = statusColor[row.estado] ?? '#6b7280'

            return (
              <div className="pb-card flex items-center gap-4 rounded-2xl p-4" key={row.id}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ background: `${color}20`, color }}>
                  <Icon color="currentColor" name={statusIcon[row.estado] ?? 'ticket'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold text-white">{row.recompensa_nombre ?? 'Recompensa'}</p>
                  <p className="text-xs text-white/40">{formatDate(row.fecha)}</p>
                  <span className="mt-1 inline-block font-mono-game text-xs text-red-400">-{formatPoints(row.puntos_utilizados)} pts</span>
                </div>
                <StatusChip status={row.estado} />
              </div>
            )
          })}
        </div>
        {rows.length === 0 && !error && <EmptyState icon="ticket" text="Canjea una recompensa para verla aquí." title="Sin canjes" />}
      </div>
    </Page>
  )
}
