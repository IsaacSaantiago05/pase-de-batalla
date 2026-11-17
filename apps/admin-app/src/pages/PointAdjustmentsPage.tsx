import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, InputField, Notice } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
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
    <AdminPage background="linear-gradient(180deg, #0d0018 0%, #080c18 100%)" title="AJUSTES DE PUNTOS">
      <form className="pb-card flex flex-col gap-3 rounded-2xl p-5" onSubmit={onSubmit}>
        <p className="text-sm leading-relaxed text-white/50">
          Usa un número negativo para restar. El motivo es obligatorio y queda registrado junto con quien hizo el ajuste.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <InputField label="Correo del cliente" onChange={(e) => setCorreo(e.target.value)} type="email" value={correo} />
          <InputField inputMode="numeric" label="Puntos (+/-)" onChange={(e) => setCantidad(e.target.value)} value={cantidad} />
        </div>
        <InputField label="Motivo" onChange={(e) => setMotivo(e.target.value)} placeholder="Mínimo 5 caracteres" value={motivo} />
        <Button className="w-full tracking-widest" type="submit" variant="purple">
          REGISTRAR AJUSTE
        </Button>
      </form>

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <TableCard title="Ajustes recientes">
        <table className="pb-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Puntos</th>
              <th>Motivo</th>
              <th>Hecho por</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.fecha).toLocaleString()}</td>
                <td>#{row.usuario_id}</td>
                <td className="font-mono-game font-bold" style={{ color: row.cantidad < 0 ? '#ef4444' : '#10b981' }}>
                  {row.cantidad > 0 ? `+${row.cantidad}` : row.cantidad}
                </td>
                <td>{row.motivo ?? '-'}</td>
                <td>#{row.otorgado_por ?? '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="text-white/40" colSpan={5}>
                  Sin ajustes todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </AdminPage>
  )
}
