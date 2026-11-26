import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiGet } from './api'
import { getAdminSession } from './auth'

// Notificaciones del panel: el negocio recibe un aviso cuando un cliente canjea una de sus recompensas.

export type NotificationItem = {
  id: string
  tipo: string | null
  titulo: string
  mensaje: string
  canje_id: number | null
  recompensa_nombre: string | null
  cliente_nombre: string | null
  puntos: number | null
  leida: boolean
  fecha: string
}

type Summary = {
  no_leidas: number
  ultima: NotificationItem | null
}

type NotificationsState = {
  // Cuantas notificaciones tiene sin leer quien inicio sesion.
  unread: number
  // Vuelve a consultar el resumen (por ejemplo, despues de marcar una como leida).
  refresh: () => void
}

const NotificationsContext = createContext<NotificationsState>({ unread: 0, refresh: () => {} })

export const useNotifications = () => useContext(NotificationsContext)

// Cada cuanto se pregunta al servidor si llego algo nuevo mientras el panel esta abierto.
const POLL_MS = 20_000
// Cuanto dura en pantalla el aviso emergente.
const TOAST_MS = 8_000

// --- Timbre ---------------------------------------------------------------------------------------
// Suena (y vibra, en Android) cuando llega una notificacion con el panel abierto.
// En iPhone suena pero no vibra (Safari no lo permite) y respeta el interruptor de silencio del telefono.

const SOUND_KEY = 'pb_admin_notification_sound'

export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
  } catch {
    // Sin almacenamiento disponible la preferencia dura solo esta visita.
  }
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (audioContext) return audioContext

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  audioContext = new Ctor()
  return audioContext
}

// Mantiene listo el sonido. Los navegadores solo dejan sonar despues de un toque, y Safari en iPhone ademas
// lo vuelve a pausar al salir de la pagina o al entrar una llamada: por eso se reactiva en cada toque, no solo en el primero.
// Se escuchan varios eventos porque Safari solo cuenta como "toque valido" el final del gesto (touchend / click).
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const

function keepAudioUnlocked() {
  const unlock = () => {
    const context = getAudioContext()
    if (context && context.state !== 'running') void context.resume().catch(() => {})
  }

  UNLOCK_EVENTS.forEach((name) => window.addEventListener(name, unlock, { passive: true }))

  return () => UNLOCK_EVENTS.forEach((name) => window.removeEventListener(name, unlock))
}

// Timbre de dos notas, generado en el momento (no necesita un archivo de audio).
export function playChime() {
  try {
    navigator.vibrate?.([120, 60, 120])
  } catch {
    // Algunos navegadores no permiten vibrar; no es un error.
  }

  const context = getAudioContext()
  if (!context) return
  void context.resume().catch(() => {})

  const start = context.currentTime + 0.02
  const notes = [
    { frequency: 880, at: 0 },
    { frequency: 1174.66, at: 0.16 },
  ]

  for (const note of notes) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(0.0001, start + note.at)
    gain.gain.exponentialRampToValueAtTime(0.25, start + note.at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + 0.32)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start + note.at)
    oscillator.stop(start + note.at + 0.34)
  }
}

export function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

// "hace 5 min", "hace 2 h"... y la fecha completa cuando ya paso mas de un dia.
export function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000)

  if (Number.isNaN(minutes)) return ''
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  if (minutes < 60 * 24) return `hace ${Math.floor(minutes / 60)} h`

  return new Date(value).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Consulta el resumen cada cierto tiempo y muestra un aviso emergente cuando llega una notificacion nueva.
// Solo trabaja para el administrador de negocio: es el unico rol que recibe notificaciones hoy.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState<NotificationItem | null>(null)
  // Ultima notificacion vista: la primera consulta solo la anota, sin avisar de lo que ya estaba ahi.
  const lastSeenId = useRef<string | null>(null)
  const started = useRef(false)

  // Se vuelve a leer en cada cambio de pantalla: asi reacciona al iniciar o cerrar sesion.
  const enabled = getAdminSession()?.role === 'ADMINISTRADOR_NEGOCIO' && pathname !== '/login'

  const refresh = useCallback(() => {
    if (getAdminSession()?.role !== 'ADMINISTRADOR_NEGOCIO') return

    apiGet<Summary>('/notifications/summary')
      .then((response) => {
        const { no_leidas, ultima } = response.data
        setUnread(no_leidas)

        if (started.current && ultima && ultima.id !== lastSeenId.current) {
          setToast(ultima)
          if (isSoundEnabled()) playChime()
        }

        lastSeenId.current = ultima?.id ?? lastSeenId.current
        started.current = true
      })
      // Sin conexion o con la sesion vencida no se molesta al usuario: se reintenta en la siguiente vuelta.
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!enabled) {
      setUnread(0)
      setToast(null)
      lastSeenId.current = null
      started.current = false
      return
    }

    refresh()
    const stopUnlocking = keepAudioUnlocked()
    const timer = window.setInterval(refresh, POLL_MS)
    // Al volver a la pestaña se consulta de inmediato, sin esperar a la siguiente vuelta.
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      stopUnlocking()
    }
  }, [enabled, refresh])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_MS)

    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <NotificationsContext.Provider value={{ unread, refresh }}>
      {children}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 anim-fade-up" role="status">
          <div
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, #1f2a44, #111827)', border: '1px solid rgba(245,158,11,0.45)', boxShadow: '0 18px 40px rgba(0,0,0,0.6)' }}
          >
            <button
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
              onClick={() => {
                setToast(null)
                navigate('/notifications')
              }}
              type="button"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }}>
                <BellIcon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold text-white">{toast.titulo}</span>
                <span className="block text-sm text-white/70">{toast.mensaje}</span>
              </span>
            </button>
            <button aria-label="Cerrar aviso" className="shrink-0 rounded-lg px-2 py-1 text-sm text-white/40 hover:text-white/80" onClick={() => setToast(null)} type="button">
              ✕
            </button>
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  )
}
