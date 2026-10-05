import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../lib/api'

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

const NEXT_STATES: Redemption['estado'][] = ['CONFIRMADO', 'COMPLETADO', 'CANCELADO']

export function RedemptionsAdminPage() {
  const [rows, setRows] = useState<Redemption[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadRows = async () => {
    try {
      const response = await apiGet<RedemptionListPayload>('/redemptions/business')
      setRows(response.data.data ?? [])
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
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Canjes del negocio</h1>
        <p className="text-sm text-slate-600">Cancelar un canje repone stock y devuelve puntos al usuario.</p>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Recompensa</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.usuario_nombre ?? row.usuario_id}</td>
                  <td className="p-2">{row.recompensa_nombre ?? '-'}</td>
                  <td className="p-2">{row.puntos_utilizados}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">{row.fecha}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {NEXT_STATES.map((nextState) => (
                        <button
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={row.estado === 'COMPLETADO' || row.estado === 'CANCELADO' || row.estado === nextState}
                          key={`${row.id}-${nextState}`}
                          onClick={() => {
                            void updateStatus(row, nextState)
                          }}
                          type="button"
                        >
                          {nextState}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
