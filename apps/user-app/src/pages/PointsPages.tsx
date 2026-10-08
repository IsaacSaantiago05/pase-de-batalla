import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

type BalancePayload = {
  usuario_id: number
  saldo_global: number
  nivel_id: number | null
}

type Movement = {
  id: number
  cantidad: number
  tipo: string
  negocio_id: number | null
  fecha: string
}

type HistoryPayload = {
  data: Movement[]
}

export function PointsPage() {
  const [saldo, setSaldo] = useState<number>(0)
  const [nivelId, setNivelId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiGet<BalancePayload>('/points/balance')
        setSaldo(response.data.saldo_global)
        setNivelId(response.data.nivel_id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible obtener saldo')
      }
    }

    void run()
  }, [])

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Mis puntos</h1>
      <p className="mt-2 text-slate-600">Saldo global: <span className="font-semibold text-slate-900">{saldo}</span></p>
      <p className="text-slate-600">Nivel actual: <span className="font-semibold text-slate-900">{nivelId ?? 'Sin nivel'}</span></p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function HistoryPage() {
  const [rows, setRows] = useState<Movement[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiGet<HistoryPayload>('/points/history')
        setRows(response.data.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible obtener historial')
      }
    }

    void run()
  }, [])

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Historial de puntos</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Tipo</th>
              <th className="p-2">Cantidad</th>
              <th className="p-2">Negocio</th>
              <th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b" key={row.id}>
                <td className="p-2">{row.tipo}</td>
                <td className="p-2">{row.cantidad}</td>
                <td className="p-2">{row.negocio_id ?? '-'}</td>
                <td className="p-2">{row.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
