import { useEffect, useState } from 'react'
import { ChipButton, EmptyState, Notice, StatusChip, formatDate, formatPoints } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPatch, listData } from '../lib/api'

type Redemption = {
  id: number
  usuario_id: number
  usuario_nombre: string | null
  recompensa_nombre: string | null
  puntos_utilizados: number
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'
  fecha: string
}

type RedemptionListPayload = {
  data: Redemption[]
}

const ACTIONS: { estado: Redemption['estado']; label: string; tone: 'blue' | 'green' | 'red' }[] = [
  { estado: 'CONFIRMADO', label: 'Confirmar', tone: 'blue' },
  { estado: 'COMPLETADO', label: 'Entregado', tone: 'green' },
  { estado: 'CANCELADO', label: 'Cancelar', tone: 'red' },
]

export function RedemptionsAdminPage() {
  const [rows, setRows] = useState<Redemption[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadRows = async () => {
    try {
      const response = await apiGet<RedemptionListPayload>('/redemptions/business')
      setRows(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar canjes')
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  async function updateStatus(row: Redemption, estado: Redemption['estado']) {
    setError('')
    setMessage('')

    try {
      await apiPatch(`/redemptions/${row.id}/status`, { estado })
      setMessage(`Canje #${row.id} actualizado a ${estado}.`)
      await loadRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el canje')
    }
  }

  return (
    <AdminPage title="CANJES">
      <p className="text-sm leading-relaxed text-white/50">Cancelar un canje repone el stock y devuelve los puntos al cliente.</p>
      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const closed = row.estado === 'COMPLETADO' || row.estado === 'CANCELADO'

          return (
            <div className="pb-card rounded-2xl p-4" key={row.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate font-display text-base font-bold text-white">{row.usuario_nombre ?? `Cliente #${row.usuario_id}`}</p>
                <StatusChip status={row.estado} />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                <span>{row.recompensa_nombre ?? '-'}</span>
                <span>·</span>
                <span className="font-mono-game text-yellow-400">-{formatPoints(row.puntos_utilizados)} pts</span>
                <span>·</span>
                <span>{formatDate(row.fecha, true)}</span>
              </div>
              {!closed && (
                <div className="flex gap-2">
                  {ACTIONS.filter((action) => action.estado !== row.estado).map((action) => (
                    <ChipButton className="flex-1" key={action.estado} onClick={() => void updateStatus(row, action.estado)} tone={action.tone}>
                      {action.label}
                    </ChipButton>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {rows.length === 0 && !error && <EmptyState icon="clipboard" title="Sin canjes todavía" />}
    </AdminPage>
  )
}
