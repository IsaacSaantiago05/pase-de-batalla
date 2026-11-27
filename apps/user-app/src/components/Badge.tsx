import { useId } from 'react'
import type { BadgeKey } from '../lib/progress'

// Insignias del pase de batalla: se ganan en los niveles 10, 50, 100 y 150.
export const BADGES: Record<BadgeKey, { nombre: string; color: string; claro: string; oscuro: string }> = {
  BRONCE: { nombre: 'Bronce', color: '#cd7f32', claro: '#eeb27d', oscuro: '#7c4a1c' },
  PLATA: { nombre: 'Plata', color: '#c0c0c0', claro: '#f3f4f6', oscuro: '#6b7280' },
  ORO: { nombre: 'Oro', color: '#f59e0b', claro: '#fde68a', oscuro: '#b45309' },
  DIAMANTE: { nombre: 'Diamante', color: '#67e8f9', claro: '#ecfeff', oscuro: '#0e7490' },
}

export const badgeName = (badge: BadgeKey) => `Insignia ${BADGES[badge].nombre}`

// Medalla hexagonal con una estrella. `locked` la deja apagada para las que aun no se alcanzan.
export function BadgeIcon({ badge, size = 40, locked = false }: { badge: BadgeKey; size?: number; locked?: boolean }) {
  const gradientId = useId()
  const { claro, color, oscuro } = BADGES[badge]

  return (
    <svg
      aria-label={locked ? `${badgeName(badge)} (bloqueada)` : badgeName(badge)}
      className="shrink-0"
      height={size}
      role="img"
      style={locked ? { filter: 'grayscale(0.85)', opacity: 0.45 } : { filter: `drop-shadow(0 0 6px ${color}66)` }}
      viewBox="0 0 48 48"
      width={size}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={claro} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={oscuro} />
        </linearGradient>
      </defs>
      <path d="M24 3 41.5 13v22L24 45 6.5 35V13z" fill={`url(#${gradientId})`} stroke={oscuro} strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M24 8.5 36.7 15.8v16.4L24 39.5l-12.7-7.3V15.8z" fill="none" opacity="0.55" stroke={claro} strokeLinejoin="round" strokeWidth="1" />
      <path
        d="m24 14.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z"
        fill="rgba(255,255,255,0.92)"
        stroke={oscuro}
        strokeLinejoin="round"
        strokeWidth="0.8"
      />
    </svg>
  )
}

// Etiqueta "Insignia Bronce" con su color, para ponerla junto al nivel.
export function BadgeChip({ badge }: { badge: BadgeKey }) {
  const { color } = BADGES[badge]

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2.5 font-display text-xs font-bold tracking-wide"
      style={{ background: `${color}22`, border: `1px solid ${color}66`, color }}
    >
      <BadgeIcon badge={badge} size={18} />
      {BADGES[badge].nombre}
    </span>
  )
}
