import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, ChevronRight, Icon, SectionTitle } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { apiGet, listData } from '../lib/api'
import { clearAdminSession, getAdminSession } from '../lib/auth'

type Me = { nombre: string }
type Business = { id: number; nombre: string }
type Summary = {
  qr: { hoy: { generados: number; utilizados: number } }
  // Solo llega para el administrador general.
  clientes_activos?: { semana: number }
}
type MenuItem = { to: string; icon: IconName; label: string }

// Pantallas del negocio que ya estan construidas (las que faltan no se muestran).
const BUSINESS_MENU: MenuItem[] = [
  { to: '/clients', icon: 'clients', label: 'Clientes del negocio' },
  { to: '/points', icon: 'points', label: 'Movimientos de puntos' },
  { to: '/qr', icon: 'qr', label: 'Códigos QR' },
  { to: '/products', icon: 'product', label: 'Productos' },
  { to: '/statistics', icon: 'stats', label: 'Estadísticas' },
  { to: '/account', icon: 'key', label: 'Mi cuenta' },
]

const PLATFORM_MENU: MenuItem[] = [
  { to: '/businesses', icon: 'business', label: 'Negocios' },
  { to: '/administrators', icon: 'shield', label: 'Administradores' },
  { to: '/adjustments', icon: 'adjust', label: 'Ajustes de puntos' },
]

function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <Link className="pb-card flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]" key={item.to} to={item.to}>
          <Icon className="w-7 text-xl" name={item.icon} />
          <span className="flex-1 text-sm font-semibold text-white">{item.label}</span>
          <ChevronRight size={14} />
        </Link>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const role = getAdminSession()?.role
  const isGeneral = role === 'ADMINISTRADOR_GENERAL'
  const [me, setMe] = useState<Me | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    apiGet<Me>('/auth/me').then((response) => setMe(response.data)).catch(() => setMe(null))
    apiGet<Summary>('/statistics').then((response) => setSummary(response.data)).catch(() => setSummary(null))
    if (!isGeneral) {
      apiGet<Business[]>('/businesses')
        .then((response) => setBusiness(listData(response.data)[0] ?? null))
        .catch(() => setBusiness(null))
    }
  }, [isGeneral])

  function logout() {
    clearAdminSession()
    navigate('/login', { replace: true })
  }

  // Tarjetas de arriba: QR del dia para todos y clientes activos solo para el administrador general.
  const stats: { label: string; value: number; hint: string; icon: IconName; color: string }[] = summary
    ? [
        {
          label: 'QR generados hoy',
          value: summary.qr.hoy.generados,
          hint: `${summary.qr.hoy.utilizados.toLocaleString('es-MX')} canjeados · ver semana y mes`,
          icon: 'qr',
          color: '#60a5fa',
        },
        ...(isGeneral && summary.clientes_activos
          ? [{ label: 'Clientes activos', value: summary.clientes_activos.semana, hint: 'últimos 7 días', icon: 'clients' as IconName, color: '#a855f7' }]
          : []),
      ]
    : []

  return (
    <div className="flex flex-1 flex-col" style={{ background: isGeneral ? 'linear-gradient(180deg, #0d0018 0%, #080c18 100%)' : 'linear-gradient(180deg, #060c04 0%, #080c18 100%)' }}>
      <div className="px-5 pb-4 pt-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {isGeneral ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-0.5 font-display text-xs uppercase tracking-widest text-white/40">Panel General · {me?.nombre ?? ''}</p>
              <p className="pb-text-purple font-display text-xl font-bold tracking-widest">ADMINISTRADOR GENERAL</p>
            </div>
            <button className="font-display text-xs font-semibold tracking-wide text-white/40 hover:text-white/70" onClick={logout} type="button">
              Salir
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Icon name="business" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xs uppercase tracking-widest text-white/40">Negocio</p>
                <p className="truncate font-display text-lg font-bold tracking-wide text-white">{business?.nombre ?? me?.nombre ?? '-'}</p>
              </div>
              <button className="ml-auto font-display text-xs font-semibold tracking-wide text-white/40 hover:text-white/70" onClick={logout} type="button">
                Salir
              </button>
            </div>
            <p className="font-display text-xl font-bold tracking-widest text-yellow-400">ADMINISTRACIÓN</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-5 px-5 py-4 pb-8">
        {stats.length > 0 && (
          <div className={`grid gap-3 ${stats.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {stats.map((stat) => (
              <Link
                className="flex flex-col gap-2 rounded-2xl p-4 transition-all active:scale-[0.98]"
                key={stat.label}
                style={{ background: 'linear-gradient(135deg, #1a2235, #111827)', border: `1px solid ${stat.color}20` }}
                to="/statistics"
              >
                <div className="flex items-center gap-2">
                  <Icon className="text-xl" color={stat.color} name={stat.icon} />
                  <span className="flex-1 font-display text-xs font-bold tracking-wide" style={{ color: stat.color }}>
                    {stat.label}
                  </span>
                  <ChevronRight size={14} />
                </div>
                <span className="font-mono-game text-3xl font-bold text-white">{stat.value.toLocaleString('es-MX')}</span>
                <span className="text-xs text-white/40">{stat.hint}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Acciones Rápidas</SectionTitle>
          {!isGeneral && (
            <Button className="w-full tracking-widest" onClick={() => navigate('/qr')}>
              <Icon className="mr-1.5" color="currentColor" name="qr" />
              GENERAR CÓDIGO QR
            </Button>
          )}
          <Link
            className="w-full rounded-xl py-3 text-center font-display text-sm font-bold tracking-widest transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.08))', border: '1px solid rgba(124,58,237,0.3)', color: '#a855f7' }}
            to="/rewards"
          >
            <Icon className="mr-1.5" color="currentColor" name="reward" />
            {isGeneral ? 'RECOMPENSAS' : 'MIS RECOMPENSAS'}
          </Link>
          <Link
            className="pb-soft w-full rounded-xl py-3 text-center font-display text-sm font-bold tracking-widest text-white/60 transition-all active:scale-95"
            to="/redemptions"
          >
            <Icon className="mr-1.5" color="currentColor" name="clipboard" />
            GESTIONAR CANJES
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle className="text-white/40">Gestión</SectionTitle>
          <MenuList items={isGeneral ? [...PLATFORM_MENU, ...BUSINESS_MENU] : BUSINESS_MENU} />
        </div>
      </div>
    </div>
  )
}
