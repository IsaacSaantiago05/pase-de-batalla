import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, ChipButton, EmptyState, GlowButton, Icon, LoadingState, Notice, ProgressBar, ScreenHeader, SectionTitle, formatPoints } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { BADGES, BadgeIcon, badgeName } from '../components/Badge'
import { apiGet, apiPost } from '../lib/api'
import { levelInfo } from '../lib/progress'
import type { BattlePassProgress, BattlePassTier, TierStatus } from '../lib/progress'

type ClaimResult = {
  niveles_reclamados: number
  puntos_reclamados: number
  saldo_global: number
}

// Con 150 niveles no se listan todos: solo los que estan listos, los que vienen y, si se piden, los reclamados.
const PENDING_SHOWN = 6
const UPCOMING_SHOWN = 10
const CLAIMED_STEP = 20

// Color de cada estado del nivel en la ruta de progresion.
const tierColor: Record<TierStatus, string> = {
  RECLAMADO: '#10b981',
  DESBLOQUEADO: '#f59e0b',
  BLOQUEADO: '#a855f7',
}

const points = (value: number) => `${formatPoints(value)} ${value === 1 ? 'punto' : 'puntos'}`

function LevelRow({ tier, action }: { tier: BattlePassTier; action: ReactNode }) {
  const reached = tier.estado_usuario !== 'BLOQUEADO'
  const color = tier.insignia && reached ? BADGES[tier.insignia].color : tierColor[tier.estado_usuario]

  return (
    <li
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{
        background: reached ? `linear-gradient(135deg, ${color}14, #1a2235)` : 'linear-gradient(135deg, #1a2235, #111827)',
        border: `1px solid ${reached ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: reached ? `${color}20` : 'rgba(255,255,255,0.04)' }}>
        {tier.insignia ? <BadgeIcon badge={tier.insignia} locked={!reached} size={34} /> : <Icon color={reached ? color : 'rgba(255,255,255,0.3)'} name="pointsSolid" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-bold tracking-wider" style={{ color: reached ? color : 'rgba(255,255,255,0.4)' }}>
          NIVEL {tier.nivel} · {formatPoints(tier.puntos_requeridos)} PTS
        </p>
        <p className="text-sm font-semibold" style={{ color: reached ? '#fff' : 'rgba(255,255,255,0.55)' }}>
          {tier.insignia ? `${badgeName(tier.insignia)} · +${points(tier.puntos_bono)}` : `+${points(tier.puntos_bono)}`}
        </p>
      </div>
      {action}
    </li>
  )
}

export function BattlePassPage() {
  const goBack = useGoBack()
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  // Id del nivel que se esta reclamando, o 'all' para "Reclamar todo".
  const [claiming, setClaiming] = useState<number | 'all' | null>(null)
  const [showClaimed, setShowClaimed] = useState(false)
  const [claimedShown, setClaimedShown] = useState(CLAIMED_STEP)

  const fetchProgress = useCallback(async () => {
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

  async function claim(target: BattlePassTier | 'all') {
    setClaiming(target === 'all' ? 'all' : target.id)
    setFeedback(null)
    setError(null)

    try {
      const response = await apiPost<ClaimResult>(target === 'all' ? '/battle-pass/claim-all' : `/battle-pass/tiers/${target.id}/claim`, {})
      const { niveles_reclamados: levels, puntos_reclamados: bonus } = response.data

      if (levels === 0) {
        setFeedback('No tienes niveles por reclamar.')
      } else if (target === 'all') {
        setFeedback(`Reclamaste ${levels} ${levels === 1 ? 'nivel' : 'niveles'}: +${points(bonus)}.`)
      } else {
        setFeedback(`Reclamaste +${points(bonus)} del nivel ${target.nivel}.`)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo reclamar el nivel.')
    } finally {
      // Se vuelve a pedir el progreso tambien si fallo: el nivel pudo reclamarse desde otro dispositivo.
      await fetchProgress()
      setClaiming(null)
    }
  }

  const info = levelInfo(progress)
  const tiers = progress?.tiers ?? []
  const pending = tiers.filter((tier) => tier.estado_usuario === 'DESBLOQUEADO')
  const upcoming = tiers.filter((tier) => tier.estado_usuario === 'BLOQUEADO').slice(0, UPCOMING_SHOWN)
  // Los reclamados se muestran del mas reciente al mas antiguo.
  const claimed = tiers.filter((tier) => tier.estado_usuario === 'RECLAMADO').reverse()
  const badges = tiers.filter((tier) => tier.insignia !== null)
  const busy = claiming !== null

  const claimButton = (tier: BattlePassTier) => (
    <ChipButton aria-label={`Reclamar nivel ${tier.nivel}`} disabled={busy} onClick={() => void claim(tier)} tone="gold">
      {claiming === tier.id ? '...' : 'RECLAMAR'}
    </ChipButton>
  )

  return (
    <Page background="linear-gradient(180deg, #080412 0%, #080c18 100%)">
      <ScreenHeader onBack={goBack} title="PASE DE BATALLA" />

      <div className="mb-4 px-5">
        <div
          className="relative overflow-hidden rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #1a0838 0%, #0e1428 100%)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 8px 32px rgba(124,58,237,0.15)' }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

          <div className="relative mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-purple-400">
                {info.badge ? badgeName(info.badge) : 'Tu progreso'}
              </p>
              <p className="pb-text-gold font-display text-3xl font-bold">NIVEL {info.level}</p>
              {!info.noTiers && <p className="font-display text-xs font-semibold tracking-wider text-white/40">de {info.maxLevel}</p>}
            </div>
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              {info.badge ? <BadgeIcon badge={info.badge} size={48} /> : <Icon name="pointsSolid" />}
            </div>
          </div>

          <ProgressBar color="#7c3aed" current={info.barCurrent} height={12} max={info.barMax} />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono-game text-xs text-purple-300">{formatPoints(info.earned)} PTS ganados</span>
            <span className="font-mono-game text-xs text-white/40">{info.maxed ? 'NIVEL MÁXIMO' : `${formatPoints(info.goal)} PTS`}</span>
          </div>
          {!info.maxed && !info.noTiers && progress && (
            <p className="mt-2 text-xs text-white/50">
              Te faltan {points(info.remaining)} para el nivel {info.nextLevel}.
            </p>
          )}
        </div>
      </div>

      {loading && <LoadingState text="Cargando progreso..." />}
      <div className="flex flex-col gap-3 px-5">
        {error && <Notice tone="error">{error}</Notice>}
        {feedback && <Notice tone="success">{feedback}</Notice>}
      </div>

      {!loading && info.noTiers && <EmptyState icon="points" text="La administración aún no configura los niveles del pase." title="Sin niveles todavía" />}

      {progress && !info.noTiers && (
        <div className="flex flex-col gap-5 px-5 pb-6 pt-4">
          {info.pendingLevels > 0 && (
            <section
              aria-label="Por reclamar"
              className="flex flex-col gap-3 rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.14), #1a2235)', border: '1px solid rgba(245,158,11,0.35)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: 'rgba(245,158,11,0.18)' }}>
                  <Icon name="reward" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-bold uppercase tracking-widest text-yellow-400">Por reclamar</p>
                  <p className="font-display text-lg font-bold text-white">+{points(info.pendingPoints)}</p>
                  <p className="text-xs text-white/50">
                    {info.pendingLevels} {info.pendingLevels === 1 ? 'nivel listo' : 'niveles listos'}
                  </p>
                </div>
              </div>
              <GlowButton className="w-full tracking-widest" disabled={busy} onClick={() => void claim('all')} small>
                {claiming === 'all' ? 'RECLAMANDO...' : 'RECLAMAR TODO'}
              </GlowButton>
            </section>
          )}

          {info.nextBadge && (
            <section aria-label="Próxima insignia">
              <SectionTitle className="mb-2">Próxima insignia</SectionTitle>
              <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #a855f715, #1a2235)', border: '1px solid #a855f735' }}>
                <BadgeIcon badge={info.nextBadge.insignia} locked size={52} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-bold tracking-widest" style={{ color: BADGES[info.nextBadge.insignia].color }}>
                    NIVEL {info.nextBadge.nivel}
                  </p>
                  <p className="font-display text-base font-bold text-white">{badgeName(info.nextBadge.insignia)}</p>
                  <p className="mb-2 mt-0.5 text-xs text-white/50">
                    Faltan {points(info.nextBadge.faltante)} · Bono +{formatPoints(info.nextBadge.puntos_bono)} pts
                  </p>
                  <ProgressBar color={BADGES[info.nextBadge.insignia].color} current={info.earned} height={6} max={info.nextBadge.puntos_requeridos} />
                </div>
              </div>
            </section>
          )}

          <section aria-label="Insignias">
            <SectionTitle className="mb-2">Insignias</SectionTitle>
            <ul className="grid grid-cols-2 gap-3">
              {badges.map((tier) => {
                const badge = tier.insignia!
                const reached = tier.estado_usuario !== 'BLOQUEADO'

                return (
                  <li
                    className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center"
                    key={tier.id}
                    style={{
                      background: reached ? `linear-gradient(160deg, ${BADGES[badge].color}18, #111827)` : 'linear-gradient(160deg, #1a2235, #111827)',
                      border: `1px solid ${reached ? `${BADGES[badge].color}45` : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <BadgeIcon badge={badge} locked={!reached} size={46} />
                    <p className="font-display text-sm font-bold" style={{ color: reached ? BADGES[badge].color : 'rgba(255,255,255,0.5)' }}>
                      {BADGES[badge].nombre}
                    </p>
                    <p className="text-xs text-white/40">
                      Nivel {tier.nivel} · +{formatPoints(tier.puntos_bono)} pts
                    </p>
                    {tier.estado_usuario === 'DESBLOQUEADO' ? (
                      claimButton(tier)
                    ) : (
                      <span className="flex items-center gap-1 py-1.5 font-display text-xs font-bold tracking-wide" style={{ color: reached ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                        <Icon color="currentColor" name={reached ? 'check' : 'lockSolid'} />
                        {reached ? 'Reclamada' : 'Bloqueada'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {pending.length > 0 && (
            <section aria-label="Listos para reclamar">
              <SectionTitle className="mb-2">Listos para reclamar</SectionTitle>
              <ul className="flex flex-col gap-2">
                {pending.slice(0, PENDING_SHOWN).map((tier) => (
                  <LevelRow action={claimButton(tier)} key={tier.id} tier={tier} />
                ))}
              </ul>
              {pending.length > PENDING_SHOWN && (
                <p className="mt-2 text-center text-xs text-white/40">
                  y {pending.length - PENDING_SHOWN} {pending.length - PENDING_SHOWN === 1 ? 'nivel más' : 'niveles más'}. Usa «Reclamar todo» para recibirlos de una vez.
                </p>
              )}
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-label="Próximos niveles">
              <SectionTitle className="mb-2">Próximos niveles</SectionTitle>
              <ul className="flex flex-col gap-2">
                {upcoming.map((tier) => (
                  <LevelRow action={<Icon className="text-base" color="rgba(255,255,255,0.2)" label="Bloqueado" name="lockSolid" />} key={tier.id} tier={tier} />
                ))}
              </ul>
            </section>
          )}

          {claimed.length > 0 && (
            <section aria-label="Niveles reclamados">
              <button
                aria-expanded={showClaimed}
                className="pb-soft flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
                onClick={() => setShowClaimed((open) => !open)}
                type="button"
              >
                <Icon className="text-lg" color="#10b981" name="check" />
                <span className="flex-1 font-display text-xs font-bold uppercase tracking-widest text-white/60">Niveles reclamados ({claimed.length})</span>
                <span className={`transition-transform ${showClaimed ? 'rotate-90' : ''}`}>
                  <ChevronRight size={14} />
                </span>
              </button>

              {showClaimed && (
                <>
                  <ul className="mt-2 flex flex-col gap-2">
                    {claimed.slice(0, claimedShown).map((tier) => (
                      <LevelRow action={<Icon className="text-base" color="#10b981" label="Reclamado" name="check" />} key={tier.id} tier={tier} />
                    ))}
                  </ul>
                  {claimed.length > claimedShown && (
                    <ChipButton className="mx-auto mt-3 block" onClick={() => setClaimedShown((shown) => shown + CLAIMED_STEP)}>
                      VER MÁS
                    </ChipButton>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}
    </Page>
  )
}
