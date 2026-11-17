// Componentes visuales del diseño de Figma, comunes a user-app y admin-app.
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { Icon } from './icons'
import type { IconName } from './icons'

export { Icon }
export type { IconName }

type ButtonVariant = 'gold' | 'ghost' | 'purple' | 'green' | 'danger'

const buttonStyles: Record<ButtonVariant, CSSProperties> = {
  gold: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#0d0a00',
    boxShadow: '0 4px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  ghost: {
    border: '1px solid rgba(245,158,11,0.4)',
    color: '#f59e0b',
    background: 'rgba(245,158,11,0.06)',
  },
  purple: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  },
  green: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
  },
}

const buttonSizes = {
  sm: 'py-2 px-4 text-sm',
  md: 'py-3 px-6 text-base',
  lg: 'py-4 px-8 text-lg',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: keyof typeof buttonSizes
}

export function Button({ variant = 'gold', size = 'md', className = '', type = 'button', style, ...props }: ButtonProps) {
  return (
    <button
      className={`font-display font-bold tracking-wider rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${buttonSizes[size]} ${className}`}
      style={{ ...buttonStyles[variant], ...style }}
      type={type}
      {...props}
    />
  )
}

// Boton pequeño de accion dentro de tarjetas (Editar, Desactivar, Confirmar...).
type ChipTone = 'neutral' | 'green' | 'red' | 'gold' | 'purple' | 'blue'

const chipTones: Record<ChipTone, CSSProperties> = {
  neutral: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' },
  green: { background: 'rgba(16,185,129,0.15)', color: '#10b981' },
  red: { background: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  gold: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  purple: { background: 'rgba(124,58,237,0.18)', color: '#a855f7' },
  blue: { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
}

export function ChipButton({ tone = 'neutral', className = '', type = 'button', style, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ChipTone }) {
  return (
    <button
      className={`py-1.5 px-3 rounded-xl text-xs font-display font-bold tracking-wide transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ ...chipTones[tone], ...style }}
      type={type}
      {...props}
    />
  )
}

export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: 'linear-gradient(160deg, #1a2235 0%, #111827 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: glow ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${glow}30, 0 4px 16px ${glow}20` : '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  )
}

export function ProgressBar({ current, max, color = '#f59e0b', height = 8 }: { current: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0

  return (
    <div
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={current}
      className="w-full rounded-full overflow-hidden"
      role="progressbar"
      style={{ height, background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99 0%, ${color} 100%)`, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  )
}

export function LevelBadge({ level, size = 'md' }: { level: number | string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' }

  return (
    <span
      className={`inline-block font-display font-bold tracking-widest rounded-full ${sizes[size]}`}
      style={{ background: 'linear-gradient(135deg, #f59e0b22, #f59e0b44)', border: '1px solid #f59e0b66', color: '#fcd34d' }}
    >
      NV. {level}
    </span>
  )
}

export function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      aria-label="Volver"
      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90"
      onClick={onBack}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      type="button"
    >
      <svg fill="none" height="18" stroke="#f9fafb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="18">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
    </button>
  )
}

export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      {onBack ? <BackButton onBack={onBack} /> : <div className="w-10" />}
      <h1 className="font-display font-bold text-xl tracking-wider text-white text-center truncate">{title}</h1>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  )
}

export function ChevronRight({ size = 18 }: { size?: number }) {
  return (
    <svg fill="none" height={size} stroke="rgba(255,255,255,0.3)" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// Estados del backend (y algunos del diseño) con su color.
const statusMap: Record<string, { label: string; color: string }> = {
  COMPLETADO: { label: 'Completado', color: '#10b981' },
  PENDIENTE: { label: 'Pendiente', color: '#f59e0b' },
  CANCELADO: { label: 'Cancelado', color: '#ef4444' },
  CONFIRMADO: { label: 'Confirmado', color: '#60a5fa' },
  ACTIVO: { label: 'Activo', color: '#10b981' },
  ACTIVA: { label: 'Activa', color: '#10b981' },
  INACTIVO: { label: 'Inactivo', color: '#6b7280' },
  INACTIVA: { label: 'Inactiva', color: '#6b7280' },
  SUSPENDIDO: { label: 'Suspendido', color: '#ef4444' },
  USADO: { label: 'Usado', color: '#10b981' },
  EXPIRADO: { label: 'Expirado', color: '#6b7280' },
  AGOTADA: { label: 'Agotada', color: '#ef4444' },
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const cfg = statusMap[status.toUpperCase()] ?? { label: status, color: '#6b7280' }

  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full font-display tracking-wide whitespace-nowrap" style={{ color: cfg.color, background: `${cfg.color}20` }}>
      {label ?? cfg.label}
    </span>
  )
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string }

export function InputField({ label, id, className = '', ...props }: InputFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-display font-semibold tracking-widest uppercase text-white/50" htmlFor={inputId}>
        {label}
      </label>
      <input className="pb-input" id={inputId} {...props} />
    </div>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label className="text-xs font-display font-semibold tracking-widest uppercase text-white/50" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-display font-bold tracking-widest text-white/50 uppercase ${className}`}>{children}</p>
}

// Mensaje de exito o error en el estilo del diseño.
export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const colors = { error: '#ef4444', success: '#10b981', info: '#60a5fa' }
  const color = colors[tone]

  return (
    <p className="rounded-xl px-4 py-3 text-sm font-semibold" role={tone === 'error' ? 'alert' : 'status'} style={{ background: `${color}12`, border: `1px solid ${color}35`, color }}>
      {children}
    </p>
  )
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  accent = 'gold',
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (value: T) => void
  accent?: 'gold' | 'purple'
}) {
  const active = accent === 'gold'
    ? { background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d' }
    : { background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }

  return (
    <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {options.map((option) => (
        <button
          className="px-3 py-1.5 rounded-xl text-xs font-display font-bold tracking-wide whitespace-nowrap transition-all"
          key={option.key}
          onClick={() => onChange(option.key)}
          style={value === option.key ? active : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'empty', title = 'Sin registros', text }: { icon?: IconName; title?: string; text?: string }) {
  return (
    <div className="text-center py-12 text-white/30">
      <Icon className="mx-auto mb-2 text-4xl opacity-70" color="currentColor" name={icon} />
      <p className="font-display font-bold">{title}</p>
      {text && <p className="text-xs mt-1">{text}</p>}
    </div>
  )
}

export function LoadingState({ text = 'Cargando...' }: { text?: string }) {
  return <p className="py-8 text-center text-sm font-display font-semibold tracking-widest uppercase text-white/40">{text}</p>
}

// Isla flotante decorativa del diseño (terreno, casa, arboles, mascota).
export function IslandView({ level = 1, size = 'lg', animate = true }: { level?: number; size?: 'sm' | 'md' | 'lg'; animate?: boolean }) {
  const h = size === 'lg' ? 260 : size === 'md' ? 200 : 160
  const scale = size === 'lg' ? 1 : size === 'md' ? 0.78 : 0.62
  const shadow = (blur: number) => ({ filter: `drop-shadow(0 ${blur / 2}px ${blur}px rgba(0,0,0,0.45))` })

  return (
    <div aria-hidden="true" className={`relative flex items-center justify-center overflow-hidden rounded-3xl ${animate ? 'anim-float' : ''}`} style={{ height: h }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 60%, #1e3a5f 0%, #0a1628 70%, #040710 100%)' }} />

      {Array.from({ length: 12 }, (_, i) => (
        <div
          className="absolute rounded-full bg-white"
          key={i}
          style={{
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            top: `${8 + ((i * 7) % 40)}%`,
            left: `${5 + ((i * 17) % 90)}%`,
            opacity: 0.3 + (i % 4) * 0.15,
          }}
        />
      ))}

      <Icon className="absolute text-3xl opacity-40" name="cloud" style={{ top: '12%', left: '4%' }} />
      <Icon className="absolute text-2xl opacity-25" name="cloud" style={{ top: '18%', right: '6%' }} />

      <div className="relative z-10 flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <div className="relative" style={{ width: 240, height: 100 }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 55%, #15803d 100%)', borderRadius: '120px 120px 0 0' }} />
          <div className="absolute" style={{ width: 18, height: 55, background: 'linear-gradient(180deg, #d97706, #92400e)', left: 111, top: 45, borderRadius: 4 }} />
          <Icon className="absolute text-[44px]" name="house" style={{ left: 96, top: -28, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
          <Icon className="absolute text-4xl" name="tree" style={{ left: 8, top: 4, ...shadow(6) }} />
          <Icon className="absolute text-2xl" name="pine" style={{ left: 28, top: 42, ...shadow(4) }} />
          <Icon className="absolute text-3xl" name="tree" style={{ right: 10, top: 8, ...shadow(6) }} />
          <Icon className="absolute text-xl" name="flower" style={{ right: 32, top: 48, ...shadow(4) }} />
          {level >= 1 && <Icon className="absolute text-2xl" name="dog" style={{ left: 65, top: 52 }} />}
          {level >= 12 && <Icon className="absolute text-xl" name="fountain" style={{ right: 50, top: 46 }} />}
          <Icon className="absolute text-base" name="rock" style={{ left: 50, top: 70 }} />
          {level >= 20 && <Icon className="absolute text-2xl" name="castle" style={{ right: 5, top: 50 }} />}
        </div>

        <div style={{ width: 240, height: 70, background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #431407 100%)', borderRadius: '0 0 100px 100px', boxShadow: '0 24px 48px rgba(0,0,0,0.7)' }} />
        <div className="absolute" style={{ width: 200, height: 20, background: 'linear-gradient(180deg, #a16207, #78350f)', borderRadius: '0 0 60px 60px', bottom: 30 }} />
        <div className="mt-2" style={{ width: 160, height: 18, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', filter: 'blur(10px)' }} />
      </div>
    </div>
  )
}

export const formatPoints = (value: number) => value.toLocaleString('es-MX')

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('es-MX', withTime ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' })
}
