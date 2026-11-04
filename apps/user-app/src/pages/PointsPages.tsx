import { useEffect, useState } from 'react'
import { EmptyState, FilterTabs, LevelBadge, Notice, ProgressBar, ScreenHeader, SectionTitle, formatDate, formatPoints } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, listData } from '../lib/api'
import { levelInfo, movementLabel } from '../lib/progress'
import type { BattlePassProgress, Movement } from '../lib/progress'

type BalancePayload = {
  usuario_id: number
  saldo_global: number
  nivel_id: number | null
}

type HistoryPayload = {
  data: Movement[]
}

function useMovements() {
  const [rows, setRows] = useState<Movement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<HistoryPayload>('/points/history')
      .then((response) => setRows(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible obtener historial'))
  }, [])

  return { rows, error }
}

function MovementRow({ item }: { item: Movement }) {
  const positive = item.cantidad >= 0
  const color = positive ? '#10b981' : '#ef4444'

  return (
    <div className="pb-card flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
        {positive ? '⭐' : '🎁'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{movementLabel(item)}</p>
        <p className="text-xs text-white/40">{formatDate(item.fecha, true)}</p>
      </div>
      <span className="shrink-0 font-mono-game text-sm font-bold" style={{ color }}>
        {positive ? '+' : ''}
        {item.cantidad} pts
      </span>
    </div>
  )
}

export function PointsPage() {
  const goBack = useGoBack()
  const [saldo, setSaldo] = useState<number | null>(null)
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [error, setError] = useState('')
  const history = useMovements()

  useEffect(() => {
    apiGet<BalancePayload>('/points/balance')
      .then((response) => setSaldo(response.data.saldo_global))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible obtener saldo'))
    apiGet<BattlePassProgress>('/battle-pass/progress').then((response) => setProgress(response.data)).catch(() => setProgress(null))
  }, [])

  const info = levelInfo(progress)

  return (
    <Page background="linear-gradient(180deg, #0a0c04 0%, #080c18 100%)">
      <ScreenHeader onBack={goBack} title="MIS PUNTOS" />

      <div className="mb-4 px-5">
        <div
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl p-6"
          style={{ background: 'linear-gradient(135deg, #1c1600, #0a1628)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 8px 40px rgba(245,158,11,0.12)' }}
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
          <span className="text-5xl">⭐</span>
          <div className="pb-text-gold font-mono-game text-6xl font-bold">{saldo === null ? '-' : formatPoints(saldo)}</div>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-white/60">Puntos para canjear</p>

          <div className="mt-1 w-full">
            <div className="mb-2 flex justify-between">
              <LevelBadge level={info.level} size="sm" />
              <span className="font-mono-game text-xs text-white/40">{info.maxed ? 'NIVEL MÁXIMO' : info.noTiers ? '' : `→ NV. ${info.level + 1}`}</span>
            </div>
            <ProgressBar current={info.earned} height={10} max={info.goal} />
            <p className="mt-1.5 text-center text-xs text-white/40">
              {info.maxed || info.noTiers
                ? `${formatPoints(info.earned)} puntos ganados en total`
                : `${formatPoints(info.remaining)} puntos ganados para el siguiente nivel`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {error && <Notice tone="error">{error}</Notice>}
        {history.error && <Notice tone="error">{history.error}</Notice>}
      </div>

      <div className="px-5">
        <SectionTitle className="mb-3 text-white/40">Historial de Puntos</SectionTitle>
      </div>
      <div className="px-5 pb-6">
        <div className="grid gap-2 md:grid-cols-2">
          {history.rows.map((item) => (
            <MovementRow item={item} key={item.id} />
          ))}
        </div>
        {history.rows.length === 0 && !history.error && <EmptyState />}
      </div>
    </Page>
  )
}

type HistoryFilter = 'all' | 'earned' | 'redeemed'

export function HistoryPage() {
  const goBack = useGoBack()
  const { rows, error } = useMovements()
  const [filter, setFilter] = useState<HistoryFilter>('all')

  const filtered = rows.filter((row) => {
    if (filter === 'earned') return row.tipo === 'GANANCIA'
    if (filter === 'redeemed') return row.tipo === 'CANJE'
    return true
  })

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="HISTORIAL" />

      <div className="mb-4 px-5">
        <FilterTabs
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Todos' },
            { key: 'earned', label: 'Puntos ganados' },
            { key: 'redeemed', label: 'Canjes' },
          ]}
          value={filter}
        />
      </div>

      <div className="px-5 pb-6">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((item) => (
            <MovementRow item={item} key={item.id} />
          ))}
        </div>
        {filtered.length === 0 && !error && <EmptyState />}
      </div>
    </Page>
  )
}
