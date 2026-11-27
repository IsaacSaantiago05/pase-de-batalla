import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Card, Icon, IslandView, LevelBadge, ProgressBar, SectionTitle, formatDate, formatPoints } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { Page } from '../components/AppLayout'
import { BadgeIcon, badgeName } from '../components/Badge'
import { apiGet, listData } from '../lib/api'
import { levelInfo, movementDetail, movementLabel } from '../lib/progress'
import type { BattlePassProgress, Movement } from '../lib/progress'

type Me = { nombre: string; foto_url: string | null }
type Balance = { saldo_global: number }

const ACTIONS: { to: string; icon: IconName; label: string; color: string; style: CSSProperties }[] = [
  { to: '/battle-pass', icon: 'points', label: 'PASE', color: 'text-yellow-400', style: { background: 'linear-gradient(135deg, #1e2a14, #111827)', border: '1px solid rgba(245,158,11,0.25)' } },
  { to: '/island', icon: 'palette', label: 'ISLA', color: 'text-purple-400', style: { background: 'linear-gradient(135deg, #1a1040, #111827)', border: '1px solid rgba(124,58,237,0.25)' } },
  { to: '/scan-qr', icon: 'scan', label: 'ESCANEAR', color: 'text-emerald-400', style: { background: 'linear-gradient(135deg, #0a2018, #111827)', border: '1px solid rgba(16,185,129,0.25)' } },
]

const QUICK_LINKS: { to: string; icon: IconName; label: string }[] = [
  { to: '/businesses', icon: 'business', label: 'Negocios' },
  { to: '/history', icon: 'history', label: 'Historial' },
  { to: '/redemptions', icon: 'ticket', label: 'Canjes' },
  { to: '/points', icon: 'coins', label: 'Puntos' },
]

export function HomePage() {
  const [me, setMe] = useState<Me | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [recent, setRecent] = useState<Movement[]>([])

  useEffect(() => {
    apiGet<Me>('/auth/me').then((response) => setMe(response.data)).catch(() => setMe(null))
    apiGet<Balance>('/points/balance').then((response) => setBalance(response.data.saldo_global)).catch(() => setBalance(null))
    apiGet<BattlePassProgress>('/battle-pass/progress').then((response) => setProgress(response.data)).catch(() => setProgress(null))
    apiGet<{ data: Movement[] }>('/points/history')
      .then((response) => setRecent(listData(response.data).slice(0, 3)))
      .catch(() => setRecent([]))
  }, [])

  const info = levelInfo(progress)

  return (
    <Page background="#080c18">
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pb-3 pt-5"
        style={{ background: 'linear-gradient(180deg, #080c18 80%, transparent 100%)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1424)', border: '2px solid rgba(245,158,11,0.4)' }}
          >
            {/* Foto de perfil del usuario; sin foto queda el icono. */}
            {me?.foto_url ? <img alt="" className="h-full w-full object-cover" src={me.foto_url} /> : <Icon name="avatar" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold uppercase tracking-widest text-white">{me?.nombre ?? 'Jugador'}</p>
            <div className="flex items-center gap-1.5">
              <LevelBadge level={info.level} size="sm" />
              {info.badge && <BadgeIcon badge={info.badge} size={20} />}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'linear-gradient(135deg, #1a2235, #111827)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Icon className="text-base" name="pointsSolid" />
          <span className="font-mono-game text-sm font-bold text-yellow-400">{balance === null ? '-' : formatPoints(balance)}</span>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-xs font-semibold tracking-wider text-white/50">NIVEL {info.level}</span>
          <span className="font-mono-game text-xs text-white/60">
            {formatPoints(info.earned)} / {formatPoints(info.goal)} PTS
          </span>
        </div>
        <ProgressBar current={info.barCurrent} height={10} max={info.barMax} />
        <p className="mt-1.5 text-right text-xs text-white/40">
          {info.noTiers
            ? 'Aún no hay niveles configurados'
            : info.maxed
              ? 'Alcanzaste el nivel máximo'
              : `${formatPoints(info.remaining)} puntos para nivel ${info.nextLevel}`}
        </p>
      </div>

      <div className="mb-4 px-5">
        <div className="relative overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <IslandView level={info.level} size="lg" />
          <Link
            className="absolute left-3 top-3 rounded-full px-3 py-1 font-display text-xs font-bold tracking-wider"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}
            to="/island"
          >
            <Icon className="mr-1" color="currentColor" name="island" />
            MI ISLA
          </Link>
          {/* Si hay bonos del pase sin reclamar se avisa aqui; si no, se muestra la siguiente insignia. */}
          {info.pendingLevels > 0 ? (
            <Link
              className="absolute bottom-3 right-3 max-w-[70%] truncate rounded-xl px-3 py-1.5 text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.92)', color: '#1c1300', backdropFilter: 'blur(8px)' }}
              to="/battle-pass"
            >
              <Icon className="mr-1" color="currentColor" name="reward" />
              Reclama +{formatPoints(info.pendingPoints)} pts
            </Link>
          ) : (
            info.nextBadge && (
              <div
                className="absolute bottom-3 right-3 max-w-[70%] truncate rounded-xl px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'rgba(124,58,237,0.8)', color: '#fff', backdropFilter: 'blur(8px)' }}
              >
                <Icon className="mr-1" color="currentColor" name="lockSolid" />
                NV.{info.nextBadge.nivel}: {badgeName(info.nextBadge.insignia)}
              </div>
            )
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 px-5">
        {ACTIONS.map((action) => (
          <Link className={`flex flex-col items-center gap-2 rounded-2xl py-4 transition-all active:scale-95 ${action.color}`} key={action.to} style={action.style} to={action.to}>
            <Icon className="text-3xl" color="currentColor" name={action.icon} />
            <span className="font-display text-xs font-bold tracking-wide">{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 px-5">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon className="text-lg" name="target" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-white/70">Próximo Nivel</span>
          </div>
          <div className="font-mono-game text-2xl font-bold text-yellow-400">{formatPoints(info.remaining)}</div>
          <div className="text-xs text-white/40">puntos restantes</div>
          <ProgressBar current={info.barCurrent} height={5} max={info.barMax} />
        </Card>

        <Card className="flex flex-col gap-2" glow="#7c3aed">
          <div className="flex items-center gap-2">
            <Icon className="text-lg" name="reward" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-purple-400">Próxima Insignia</span>
          </div>
          {info.nextBadge ? (
            <BadgeIcon badge={info.nextBadge.insignia} locked size={28} />
          ) : (
            <Icon className="text-xl" color={info.maxed ? undefined : 'rgba(255,255,255,0.5)'} name={info.maxed ? 'trophy' : 'lock'} />
          )}
          <div className="text-xs font-semibold text-white">{info.nextBadge ? badgeName(info.nextBadge.insignia) : info.maxed ? 'Todo desbloqueado' : 'Próximamente'}</div>
          {info.nextBadge && <div className="text-xs text-white/40">Nivel {info.nextBadge.nivel}</div>}
        </Card>
      </div>

      <div className="mb-6 px-5">
        <Card>
          <SectionTitle className="mb-3 text-white/60">Accesos Rápidos</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_LINKS.map((item) => (
              <Link className="pb-soft flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-all active:scale-90" key={item.to} to={item.to}>
                <Icon className="text-xl" name={item.icon} />
                <span className="font-display text-xs font-semibold text-white/50">{item.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-8 px-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle className="text-white/60">Actividad Reciente</SectionTitle>
          <Link className="text-xs font-semibold" style={{ color: '#f59e0b' }} to="/history">
            Ver todo
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {recent.map((item) => {
            const positive = item.cantidad >= 0
            const color = positive ? '#10b981' : '#ef4444'

            return (
              <div className="pb-soft flex items-center justify-between gap-3 rounded-xl px-4 py-3" key={item.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base" style={{ background: `${color}20` }}>
                    <Icon color={color} name={positive ? 'pointsSolid' : 'reward'} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{movementLabel(item)}</p>
                    <p className="truncate text-xs text-white/40">{[movementDetail(item), formatDate(item.fecha)].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono-game text-sm font-bold" style={{ color }}>
                  {positive ? '+' : ''}
                  {item.cantidad} pts
                </span>
              </div>
            )
          })}
          {recent.length === 0 && <p className="pb-soft rounded-xl px-4 py-3 text-sm text-white/40">Aún no tienes movimientos. Escanea un QR para ganar tus primeros puntos.</p>}
        </div>
      </div>
    </Page>
  )
}
