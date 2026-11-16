import { useCallback, useEffect, useState } from 'react'
import { ChipButton, EmptyState, Icon, LoadingState, Notice, ProgressBar, ScreenHeader, SectionTitle, formatPoints } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, apiPost } from '../lib/api'
import { levelInfo } from '../lib/progress'
import type { BattlePassProgress, TierStatus } from '../lib/progress'

// Color de cada estado del rango en la ruta de progresion.
const tierColor: Record<TierStatus, string> = {
  RECLAMADO: '#10b981',
  DESBLOQUEADO: '#f59e0b',
  BLOQUEADO: '#a855f7',
}

export function BattlePassPage() {
  const goBack = useGoBack()
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [claimingTierId, setClaimingTierId] = useState<number | null>(null)

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiGet<BattlePassProgress>('/battle-pass/progress')
      setProgress(response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el pase de batalla.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProgress()
  }, [fetchProgress])

  const handleClaim = async (tierId: number) => {
    setClaimingTierId(tierId)
    setFeedback(null)
    setError(null)

    try {
      await apiPost(`/battle-pass/tiers/${tierId}/claim`, {})
      setFeedback('Recompensa reclamada correctamente.')
      await fetchProgress()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo reclamar el rango.')
    } finally {
      setClaimingTierId(null)
    }
  }

  const info = levelInfo(progress)

  return (
    <Page background="linear-gradient(180deg, #080412 0%, #080c18 100%)">
      <ScreenHeader onBack={goBack} title="PASE DE BATALLA" />

      <div className="mb-4 px-5">
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #1a0838 0%, #0e1428 100%)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 8px 32px rgba(124,58,237,0.15)' }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-purple-400">Puntos ganados</p>
              <p className="pb-text-gold font-display text-3xl font-bold">NIVEL {info.level}</p>
            </div>
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <Icon name="pointsSolid" />
            </div>
          </div>

          <ProgressBar color="#7c3aed" current={info.earned} height={12} max={info.goal} />
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono-game text-xs text-purple-300">{formatPoints(info.earned)} PTS</span>
            <span className="font-mono-game text-xs text-white/40">{formatPoints(info.goal)} PTS</span>
          </div>
        </div>
      </div>

      {loading && <LoadingState text="Cargando progreso..." />}
      <div className="flex flex-col gap-3 px-5">
        {error && <Notice tone="error">{error}</Notice>}
        {feedback && <Notice tone="success">{feedback}</Notice>}
      </div>

      {!loading && progress && info.nextTier && (
        <div className="mb-4 mt-1 px-5">
          <SectionTitle className="mb-2">Próxima Recompensa</SectionTitle>
          <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #a855f715, #1a2235)', border: '1px solid #a855f735' }}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: '#a855f720', border: '1px solid #a855f730' }}>
              <Icon color="#a855f7" name="reward" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-display text-xs font-bold tracking-widest" style={{ color: '#a855f7' }}>
                NIVEL {info.nextLevel}
              </span>
              <p className="font-display text-base font-bold text-white">{info.nextTier.recompensa_nombre}</p>
              <p className="mt-0.5 text-xs text-white/40">{formatPoints(info.remaining)} pts para desbloquear</p>
            </div>
            <Icon className="text-2xl" color="rgba(255,255,255,0.4)" name="lock" />
          </div>
        </div>
      )}

      {!loading && info.noTiers && <EmptyState icon="points" text="La administración aún no configura los niveles del pase." title="Sin niveles todavía" />}

      {!loading && progress && !info.noTiers && (
        <div className="px-5 pb-6">
          <SectionTitle className="mb-3">Ruta de Progresión</SectionTitle>
          <div className="flex flex-col gap-3">
            {progress.tiers.map((tier, i) => {
              const reached = tier.estado_usuario !== 'BLOQUEADO'
              const color = tierColor[tier.estado_usuario]

              return (
                <div className="flex items-center gap-3" key={tier.id}>
                  <div className="flex flex-col items-center" style={{ width: 32, minWidth: 32 }}>
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full font-mono-game text-xs font-bold"
                      style={{
                        background: reached ? `linear-gradient(135deg, ${color}, ${color}80)` : 'rgba(255,255,255,0.05)',
                        border: reached ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.08)',
                        color: reached ? '#000' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {reached ? <Icon color="currentColor" name="check" /> : i + 1}
                    </div>
                    {i < progress.tiers.length - 1 && <div className="mt-1 h-4 w-0.5" style={{ background: reached ? `${color}40` : 'rgba(255,255,255,0.06)' }} />}
                  </div>

                  <div
                    className="flex flex-1 items-center gap-3 rounded-2xl p-3"
                    style={{
                      background: reached ? `linear-gradient(135deg, ${color}12, #1a2235)` : 'linear-gradient(135deg, #1a2235, #111827)',
                      border: `1px solid ${reached ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
                      opacity: !reached && i > info.nextLevel + 4 ? 0.6 : 1,
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: reached ? `${color}20` : 'rgba(255,255,255,0.04)' }}>
                      <Icon color={reached ? color : 'rgba(255,255,255,0.3)'} name="reward" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-xs font-bold tracking-wider" style={{ color: reached ? color : 'rgba(255,255,255,0.4)' }}>
                        NIVEL {i + 1} · {formatPoints(tier.puntos_requeridos)} PTS
                      </span>
                      <p className="text-sm font-semibold" style={{ color: reached ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                        {tier.recompensa_nombre}
                      </p>
                      {tier.recompensa_descripcion && <p className="text-xs text-white/40">{tier.recompensa_descripcion}</p>}
                    </div>

                    {tier.estado_usuario === 'DESBLOQUEADO' ? (
                      <ChipButton disabled={claimingTierId !== null} onClick={() => void handleClaim(tier.id)} tone="gold">
                        {claimingTierId === tier.id ? '...' : 'RECLAMAR'}
                      </ChipButton>
                    ) : tier.estado_usuario === 'RECLAMADO' ? (
                      <span className="rounded-full px-2 py-0.5 font-display text-xs font-bold" style={{ background: `${color}20`, color }}>
                        <Icon color="currentColor" name="check" />
                      </span>
                    ) : (
                      <Icon className="text-base" color="rgba(255,255,255,0.2)" name="lockSolid" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Page>
  )
}
