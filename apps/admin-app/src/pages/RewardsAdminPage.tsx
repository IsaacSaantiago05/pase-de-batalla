import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet, apiPatch, apiPost } from '../lib/api'

type Reward = {
  id: number
  negocio_id: number
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  cantidad_disponible: number
  estado: boolean
}

type RewardListPayload = {
  data: Reward[]
}

export function RewardsAdminPage() {
  const [rows, setRows] = useState<Reward[]>([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState('')
  const [stock, setStock] = useState('')
  const [negocioId, setNegocioId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadRewards = async () => {
    try {
      const response = await apiGet<RewardListPayload>('/rewards')
      setRows(response.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar recompensas')
    }
  }

  useEffect(() => {
    void loadRewards()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const payload: Record<string, unknown> = {
        nombre,
        descripcion: descripcion.trim() || null,
        puntos_requeridos: Number(puntos),
        cantidad_disponible: Number(stock),
      }

      if (negocioId.trim()) {
        payload.negocio_id = Number(negocioId)
      }

      await apiPost('/rewards', payload)
      setMessage('Recompensa creada correctamente.')
      setNombre('')
      setDescripcion('')
      setPuntos('')
      setStock('')
      setNegocioId('')
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la recompensa')
    }
  }

  async function toggleStatus(row: Reward) {
    setMessage('')
    setError('')

    try {
      await apiPatch(`/rewards/${row.id}/status`, {
        estado: !row.estado,
      })
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar estado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold">Recompensas</h1>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={onSubmit}>
          <input className="rounded-md border p-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="Puntos" value={puntos} onChange={(e) => setPuntos(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="ID negocio (solo admin general)" value={negocioId} onChange={(e) => setNegocioId(e.target.value)} />
          <button className="rounded-md bg-slate-900 p-2 text-white" type="submit">Crear</button>
        </form>
        <textarea
          className="mt-3 w-full rounded-md border p-2"
          placeholder="Descripcion (opcional)"
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Listado</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Negocio</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Accion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{row.negocio_id}</td>
                  <td className="p-2">{row.nombre}</td>
                  <td className="p-2">{row.puntos_requeridos}</td>
                  <td className="p-2">{row.cantidad_disponible}</td>
                  <td className="p-2">{row.estado ? 'ACTIVA' : 'INACTIVA'}</td>
                  <td className="p-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        void toggleStatus(row)
                      }}
                      type="button"
                    >
                      {row.estado ? 'Desactivar' : 'Activar'}
                    </button>
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
