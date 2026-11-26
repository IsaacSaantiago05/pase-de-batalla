import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChipButton, LoadingState, Notice, SectionTitle } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPatch, apiPost, listData } from '../lib/api'
import { BellIcon, isSoundEnabled, playChime, setSoundEnabled, timeAgo, useNotifications } from '../lib/notifications'
import type { NotificationItem } from '../lib/notifications'

type ListPayload = { data: NotificationItem[] }

// Notificaciones del negocio: hoy, cada recompensa que un cliente canjea. Las mas recientes primero.
export function NotificationsPage() {
  const navigate = useNavigate()
  const { unread: pending, refresh } = useNotifications()
  const [rows, setRows] = useState<NotificationItem[] | null>(null)
  const [sound, setSound] = useState(isSoundEnabled)
  const [error, setError] = useState('')

  // Se vuelve a cargar cuando cambia el contador: asi una notificacion que llega con la lista abierta aparece sola.
  useEffect(() => {
    apiGet<ListPayload>('/notifications')
      .then((response) => setRows(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar las notificaciones'))
  }, [pending])

  const unread = rows?.filter((row) => !row.leida).length ?? 0

  // Abrir un aviso lo marca como leido y lleva a Gestionar canjes, donde se atiende.
  async function open(row: NotificationItem) {
    if (!row.leida) {
      try {
        await apiPatch(`/notifications/${row.id}/read`, {})
        setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, leida: true } : item)) ?? null)
        refresh()
      } catch {
        // Si no se pudo marcar, igual se abre la pantalla de canjes.
      }
    }

    navigate('/redemptions')
  }

  async function markAllRead() {
    setError('')

    try {
      await apiPost('/notifications/read-all', {})
      setRows((current) => current?.map((item) => ({ ...item, leida: true })) ?? null)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible marcar las notificaciones')
    }
  }

  return (
    <AdminPage title="NOTIFICACIONES">
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <LoadingState text="Cargando notificaciones..." />}

      {rows && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle className="text-white/40">{unread > 0 ? `${unread} sin leer` : 'Todo al día'}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {/* Al activarlo suena una vez: sirve de prueba y deja el sonido listo en el telefono. */}
              <ChipButton
                aria-pressed={sound}
                onClick={() => {
                  const next = !sound
                  setSoundEnabled(next)
                  setSound(next)
                  if (next) playChime()
                }}
                tone={sound ? 'green' : 'neutral'}
              >
                {sound ? 'Timbre: activado' : 'Timbre: desactivado'}
              </ChipButton>
              {unread > 0 && (
                <ChipButton onClick={() => void markAllRead()} tone="gold">
                  Marcar todas como leídas
                </ChipButton>
              )}
            </div>
          </div>
          <p className="text-xs text-white/40">El timbre suena cuando llega un canje y tienes el panel abierto. Con el teléfono bloqueado o el panel cerrado no suena.</p>

          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <button
                className="pb-card flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
                key={row.id}
                onClick={() => void open(row)}
                style={row.leida ? { opacity: 0.65 } : { borderColor: 'rgba(245,158,11,0.4)' }}
                type="button"
              >
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: row.leida ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.15)', color: row.leida ? 'rgba(255,255,255,0.4)' : '#fcd34d' }}
                >
                  <BellIcon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-white">{row.titulo}</span>
                    {!row.leida && <span aria-label="Sin leer" className="h-2 w-2 shrink-0 rounded-full bg-yellow-400" role="img" />}
                  </span>
                  <span className="mt-0.5 block text-sm text-white/70">{row.mensaje}</span>
                  <span className="mt-1 block text-xs text-white/40">{timeAgo(row.fecha)}</span>
                </span>
              </button>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="py-12 text-center text-white/30">
              <span className="mx-auto mb-2 flex justify-center opacity-70">
                <BellIcon size={36} />
              </span>
              <p className="font-display font-bold">Sin notificaciones</p>
              <p className="mt-1 text-xs">Aquí verás un aviso cada vez que un cliente canjee una de tus recompensas.</p>
            </div>
          )}

          {rows.length > 0 && <p className="text-center text-xs text-white/30">Se muestran las 20 más recientes. Las de más de 60 días se borran solas.</p>}
        </>
      )}
    </AdminPage>
  )
}
