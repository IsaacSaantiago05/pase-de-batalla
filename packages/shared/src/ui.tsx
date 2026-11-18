// Componentes visuales del diseño de Figma, comunes a user-app y admin-app.
import { useRef, useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, PointerEvent, ReactNode } from 'react'
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

// Fondo de las pantallas de acceso: el azul de la app arriba que baja a un ambar oscuro del color del proyecto.
export const GLOW_SCREEN_BACKGROUND = 'linear-gradient(180deg, #080c18 0%, #080c18 35%, #1a1408 75%, #2b1d06 100%)'

// Boton principal con brillo: relleno claro arriba, halo de color alrededor y texto blanco.
// El blanco solo no contrasta con el dorado claro: lleva un contorno oscuro del mismo tono para leerse bien.
const glowTones = {
  gold: {
    background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%)',
    textShadow: '0 1px 1px #7c2d12, 0 0 1px #7c2d12, 0 0 6px rgba(124,45,18,0.55)',
    boxShadow: '0 0 0 1px rgba(253,230,138,0.5) inset, 0 1px 0 rgba(255,255,255,0.5) inset, 0 0 28px rgba(245,158,11,0.45), 0 10px 32px rgba(245,158,11,0.3)',
  },
  green: {
    background: 'linear-gradient(180deg, #34d399 0%, #10b981 45%, #059669 100%)',
    textShadow: '0 1px 1px #064e3b, 0 0 1px #064e3b, 0 0 6px rgba(6,78,59,0.55)',
    boxShadow: '0 0 0 1px rgba(167,243,208,0.5) inset, 0 1px 0 rgba(255,255,255,0.45) inset, 0 0 24px rgba(16,185,129,0.45), 0 8px 26px rgba(16,185,129,0.3)',
  },
} satisfies Record<string, CSSProperties>

type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof glowTones
  // Version baja para ir junto a un campo de texto.
  compact?: boolean
}

export function GlowButton({ tone = 'gold', compact = false, className = '', type = 'button', style, ...props }: GlowButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[20px] font-display font-bold tracking-wider text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100 ${compact ? 'min-h-12 px-5 text-sm' : 'min-h-[60px] px-8 text-lg'} ${className}`}
      style={{ ...glowTones[tone], ...style }}
      type={type}
      {...props}
    />
  )
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
      className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90"
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
      {onBack ? <BackButton onBack={onBack} /> : <div className="w-11" />}
      <h1 className="font-display font-bold text-xl tracking-wider text-white text-center truncate">{title}</h1>
      <div className="w-11 flex justify-end">{right}</div>
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

// `error` muestra el mensaje debajo del campo, lo marca en rojo y lo enlaza para lectores de pantalla.
// `valid` pone una palomita verde dentro del campo cuando lo escrito ya es correcto.
// `hint` va debajo del campo (por ejemplo, los requisitos de la contraseña) y tambien se enlaza al campo.
type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; valid?: boolean; hint?: ReactNode }

export function InputField({ label, id, error, valid = false, hint, className = '', type, style, ...props }: InputFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)
  const showValid = valid && !error
  const describedBy = [error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined
  // Espacio a la derecha para el ojo (48px) y la palomita (32px) sin que el texto quede debajo.
  const paddingRight = (isPassword ? 48 : 12) + (showValid ? 32 : 0)

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-display font-semibold tracking-widest uppercase text-white/60" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`pb-input ${error ? 'pb-input-error' : showValid ? 'pb-input-valid' : ''}`}
          id={inputId}
          style={isPassword || showValid ? { paddingRight, ...style } : style}
          type={isPassword && visible ? 'text' : type}
          {...props}
        />
        {showValid && (
          <span className={`pointer-events-none absolute inset-y-0 flex items-center text-lg ${isPassword ? 'right-12' : 'right-3.5'}`}>
            <Icon color="#10b981" label="Correcto" name="success" />
          </span>
        )}
        {/* Ojo para ver lo que se escribio: evita errores sin pedir confirmar la contraseña. */}
        {isPassword && (
          <button
            aria-controls={inputId}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/60 transition-colors hover:text-white"
            onClick={() => setVisible((v) => !v)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400" id={errorId}>
          <Icon color="currentColor" name="warning" />
          {error}
        </p>
      )}
      {hint && <div id={hintId}>{hint}</div>}
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

// Imagen de la isla (apps/user-app/public/island). Recortada y en WebP a partir de IslaNv1.PNG.
const ISLAND_IMAGE = '/island/isla-nv1.webp'

// Nubes suaves del cielo: posicion vertical, ancho, duracion y retraso de la deriva.
const SKY_CLOUDS = [
  { top: '10%', width: 120, duration: 38, delay: -6, opacity: 0.85 },
  { top: '26%', width: 80, duration: 30, delay: -20, opacity: 0.6 },
  { top: '6%', width: 64, duration: 46, delay: -32, opacity: 0.5 },
]

// Isla flotante del diseño. `level` queda para cuando se agreguen elementos por nivel.
export function IslandView({ size = 'lg', animate = true }: { level?: number; size?: 'sm' | 'md' | 'lg'; animate?: boolean }) {
  const h = size === 'lg' ? 260 : size === 'md' ? 200 : 160
  const tiltRef = useRef<HTMLDivElement>(null)

  // Inclinacion leve hacia el dedo o el mouse para dar sensacion de 3D.
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!animate || !tiltRef.current) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    tiltRef.current.style.transform = `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg)`
  }

  function onPointerLeave() {
    if (tiltRef.current) tiltRef.current.style.transform = ''
  }

  return (
    <div
      aria-hidden="true"
      // isolate: el z-index interno no compite con el encabezado fijo de la pagina.
      className="relative isolate flex items-center justify-center overflow-hidden rounded-3xl"
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      style={{ height: h, background: 'linear-gradient(180deg, #5b9fe6 0%, #8cc4f2 45%, #cfe6f7 78%, #f6dcc8 100%)' }}
    >
      {/* Brillo del sol. */}
      <div className="absolute" style={{ top: '-30%', right: '-10%', width: '70%', height: '90%', background: 'radial-gradient(circle, rgba(255,247,214,0.85) 0%, rgba(255,247,214,0) 65%)' }} />

      {SKY_CLOUDS.map((cloud, i) => (
        <div
          className={`absolute ${animate ? 'anim-cloud' : ''}`}
          key={i}
          style={{
            top: cloud.top,
            // Posicion fija si no hay animacion (o el sistema pide reducir movimiento).
            left: `${10 + i * 30}%`,
            width: cloud.width,
            height: cloud.width * 0.32,
            opacity: cloud.opacity,
            background: 'white',
            borderRadius: 999,
            filter: 'blur(6px)',
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        />
      ))}

      {/* Sombra en el "suelo" que se encoge cuando la isla sube. */}
      <div
        className={`absolute ${animate ? 'anim-island-shadow' : ''}`}
        style={{ bottom: '6%', width: '46%', height: '7%', background: 'rgba(30,58,95,0.35)', borderRadius: '50%', filter: 'blur(8px)' }}
      />

      <div className="relative z-10 h-[86%]" style={{ perspective: 700 }}>
        <div className="h-full transition-transform duration-300 ease-out" ref={tiltRef} style={{ transformStyle: 'preserve-3d' }}>
          <img
            alt=""
            className={`h-full w-auto select-none ${animate ? 'anim-island' : ''}`}
            draggable={false}
            src={ISLAND_IMAGE}
            style={{ filter: 'drop-shadow(0 18px 18px rgba(15,23,42,0.35))' }}
          />
        </div>
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
