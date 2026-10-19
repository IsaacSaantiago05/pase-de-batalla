import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, listData } from '../lib/api'

type Adjustment = {
  id: number
  usuario_id: number
  negocio_id: number | null
  otorgado_por: number | null
  cantidad: number
  motivo: string | null
  fecha: string
}

type AdjustResponse = {
  saldo_global: number
}

export function PointAdjustmentsPage() {
  const [rows, setRows] = useState<Adjustment[]>([])
  const [correo, setCorreo] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadAdjustments = async () => {
    try {
      const response = await apiGet<Adjustment[]>('/points/adjustments')
      setRows(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar ajustes')
    }
  }

  useEffect(() => {
    void loadAdjustments()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const response = await apiPost<AdjustResponse>('/points/adjustments', {
        correo,
        cantidad: Number(cantidad),
        motivo,
      })
      setMessage(`Ajuste registrado. Saldo actual del cliente: ${response.data.saldo_global}`)
      setCorreo('')
      setCantidad('')
      setMotivo('')
      await loadAdjustments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el ajuste')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Ajustes de puntos</h1>
          <Link className="rounded-md border px-3 py-1 text-sm" to="/dashboard">
            Volver
          </Link>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Usa un numero negativo para restar. El motivo es obligatorio y queda registrado junto con quien hizo el ajuste.
        </p>
        <form className="grid gap-3 md:grid-cols-[1fr_140px]" onSubmit={onSubmit}>
          <input className="rounded-md border p-2" placeholder="Correo del cliente" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="Puntos (+/-)" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <input className="rounded-md border p-2 md:col-span-2" placeholder="Motivo (min. 5 caracteres)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <button className="rounded-md bg-slate-900 p-2 text-white md:col-span-2" type="submit">
            Registrar ajuste
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Ajustes recientes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Fecha</th>
                <th className="p-2">Cliente</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Motivo</th>
                <th className="p-2">Hecho por</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{new Date(row.fecha).toLocaleString()}</td>
                  <td className="p-2">#{row.usuario_id}</td>
                  <td className={`p-2 font-semibold ${row.cantidad < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {row.cantidad > 0 ? `+${row.cantidad}` : row.cantidad}
                  </td>
                  <td className="p-2">{row.motivo ?? '-'}</td>
                  <td className="p-2">#{row.otorgado_por ?? '-'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={5}>Sin ajustes todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
