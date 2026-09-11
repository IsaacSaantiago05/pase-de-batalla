import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet, apiPost } from '../lib/api'

type Rule = {
  id: number
  negocio_id: number
  puntos: number
  monto_minimo: number
  monto_maximo: number
  estado: boolean
}

type RuleList = {
  data: Rule[]
}

type Movement = {
  id: number
  usuario_id: number
  negocio_id: number | null
  tipo: string
  cantidad: number
  fecha: string
}

type MovementList = {
  data: Movement[]
}

export function BusinessPointsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [history, setHistory] = useState<Movement[]>([])
  const [usuarioId, setUsuarioId] = useState('')
  const [reglaId, setReglaId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const [rulesResponse, historyResponse] = await Promise.all([
        apiGet<RuleList>('/point-rules'),
        apiGet<MovementList>('/points/business-history'),
      ])
      setRules(rulesResponse.data.data ?? [])
      setHistory(historyResponse.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar datos')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiPost('/points/award', {
        usuario_id: Number(usuarioId),
        regla_puntos_id: Number(reglaId),
      })
      setMessage('Puntos otorgados correctamente.')
      setUsuarioId('')
      setReglaId('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible otorgar puntos')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Otorgar puntos por regla</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <input
            className="rounded-md border p-2"
            placeholder="ID usuario"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          />
          <select className="rounded-md border p-2" value={reglaId} onChange={(e) => setReglaId(e.target.value)}>
            <option value="">Selecciona regla</option>
            {rules.filter((rule) => rule.estado).map((rule) => (
              <option key={rule.id} value={rule.id}>
                Regla #{rule.id}: {rule.monto_minimo}-{rule.monto_maximo} = {rule.puntos} pts
              </option>
            ))}
          </select>
          <button className="rounded-md bg-slate-900 p-2 text-white" type="submit">
            Otorgar
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Historial de puntos otorgados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Movimiento</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.usuario_id}</td>
                  <td className="p-2">{row.tipo}</td>
                  <td className="p-2">{row.cantidad}</td>
                  <td className="p-2">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
