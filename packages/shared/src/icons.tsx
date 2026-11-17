import { Icon as IconifyIcon, addCollection } from '@iconify/react'
import type { CSSProperties } from 'react'
import { PHOSPHOR_SUBSET } from './icon-data'

// Los iconos vienen embebidos (sin peticiones a la API de Iconify), asi funcionan offline.
addCollection(PHOSPHOR_SUBSET)

// Nombre por funcion -> icono de Phosphor (estilo duotone) y su color por defecto.
const ICONS = {
  points: ['ph:star-duotone', '#f59e0b'],
  pointsSolid: ['ph:star-fill', '#f59e0b'],
  reward: ['ph:gift-duotone', '#c084fc'],
  island: ['ph:island-duotone', '#34d399'],
  user: ['ph:user-duotone', 'currentColor'],
  avatar: ['ph:user-circle-duotone', '#fcd34d'],
  scan: ['ph:scan-duotone', '#34d399'],
  camera: ['ph:camera-duotone', '#34d399'],
  qr: ['ph:qr-code-duotone', '#60a5fa'],
  sword: ['ph:sword-duotone', '#fcd34d'],
  key: ['ph:key-duotone', '#fcd34d'],
  shield: ['ph:shield-check-duotone', '#a78bfa'],
  check: ['ph:check-bold', 'currentColor'],
  close: ['ph:x-bold', 'currentColor'],
  lock: ['ph:lock-duotone', 'currentColor'],
  lockSolid: ['ph:lock-simple-fill', 'currentColor'],
  business: ['ph:storefront-duotone', '#fcd34d'],
  phone: ['ph:phone-duotone', 'currentColor'],
  location: ['ph:map-pin-duotone', 'currentColor'],
  ticket: ['ph:ticket-duotone', '#c084fc'],
  palette: ['ph:palette-duotone', '#c084fc'],
  target: ['ph:target-duotone', '#f59e0b'],
  trophy: ['ph:trophy-duotone', '#f59e0b'],
  coins: ['ph:coins-duotone', '#f59e0b'],
  money: ['ph:currency-circle-dollar-duotone', '#10b981'],
  calendar: ['ph:calendar-duotone', '#60a5fa'],
  history: ['ph:clock-counter-clockwise-duotone', '#60a5fa'],
  structure: ['ph:house-duotone', '#fbbf24'],
  decoration: ['ph:tree-duotone', '#34d399'],
  pet: ['ph:dog-duotone', '#fbbf24'],
  terrain: ['ph:plant-duotone', '#4ade80'],
  element: ['ph:puzzle-piece-duotone', '#a78bfa'],
  arrowRight: ['ph:arrow-right-bold', 'currentColor'],
  edit: ['ph:pencil-simple-duotone', '#fcd34d'],
  stats: ['ph:chart-bar-duotone', '#60a5fa'],
  logout: ['ph:sign-out-duotone', '#f87171'],
  pending: ['ph:hourglass-duotone', 'currentColor'],
  adjust: ['ph:scales-duotone', '#a78bfa'],
  clients: ['ph:users-three-duotone', '#a855f7'],
  clipboard: ['ph:clipboard-text-duotone', '#60a5fa'],
  product: ['ph:package-duotone', '#fbbf24'],
  receipt: ['ph:receipt-duotone', '#60a5fa'],
  construction: ['ph:barricade-duotone', '#f59e0b'],
  empty: ['ph:tray-duotone', 'currentColor'],
  success: ['ph:check-circle-duotone', '#10b981'],
  error: ['ph:x-circle-duotone', '#ef4444'],
  warning: ['ph:warning-circle-duotone', '#f59e0b'],
  // Decoracion de la isla.
  cloud: ['ph:cloud-fill', '#cbd5e1'],
  house: ['ph:house-fill', '#fbbf24'],
  tree: ['ph:tree-fill', '#047857'],
  pine: ['ph:tree-evergreen-fill', '#065f46'],
  flower: ['ph:flower-fill', '#f9a8d4'],
  dog: ['ph:dog-fill', '#92400e'],
  fountain: ['ph:drop-fill', '#38bdf8'],
  rock: ['ph:mountains-fill', '#64748b'],
  castle: ['ph:castle-turret-fill', '#e2e8f0'],
} as const satisfies Record<string, readonly [string, string]>

export type IconName = keyof typeof ICONS

type IconProps = {
  name: IconName
  className?: string
  // Color del icono; 'currentColor' hereda el color del texto.
  color?: string
  style?: CSSProperties
  label?: string
}

// Icono de la interfaz. Mide 1em: el tamaño se controla con clases text-* igual que el texto.
export function Icon({ name, className = '', color, style, label }: IconProps) {
  const [icon, defaultColor] = ICONS[name]

  return (
    <IconifyIcon
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      icon={icon}
      role={label ? 'img' : undefined}
      style={{ color: color ?? defaultColor, ...style }}
    />
  )
}
