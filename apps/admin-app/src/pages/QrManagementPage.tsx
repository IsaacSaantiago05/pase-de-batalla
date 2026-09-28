import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet, apiPost } from '../lib/api'

type QrCode = {
  id: number
  negocio_id: number
  token: string
  puntos: number
  estado: 'ACTIVO' | 'UTILIZADO' | 'EXPIRADO' | 'CANCELADO'
  fecha_creacion: string
  fecha_expiracion: string | null
  fecha_uso: string | null
  usuario_id: number | null
}

type QrListPayload = {
  data: QrCode[]
}

type GeneratedQrPayload = QrCode

export function QrManagementPage() {
  const [rows, setRows] = useState<QrCode[]>([])
  const [puntos, setPuntos] = useState('')
  const [negocioId, setNegocioId] = useState('')
  const [fechaExpiracion, setFechaExpiracion] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadQrCodes = async () => {
    try {
      const response = await apiGet<QrListPayload>('/qr')
      setRows(response.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar codigos QR')
    }
  }

  useEffect(() => {
    void loadQrCodes()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const payload: Record<string, unknown> = {
        puntos: Number(puntos),
      }

      if (negocioId.trim()) {
        payload.negocio_id = Number(negocioId)
      }

      if (fechaExpiracion.trim()) {
        payload.fecha_expiracion = new Date(fechaExpiracion).toISOString()
      }

      const response = await apiPost<GeneratedQrPayload>('/qr/generate', payload)
      setMessage(`QR generado: ${response.data.token}`)
      setPuntos('')
      setNegocioId('')
      setFechaExpiracion('')
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar QR')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Generar codigo QR</h2>
        <p className="mb-4 text-sm text-slate-600">
          Para ADMINISTRADOR_GENERAL el campo negocio es obligatorio. Para ADMINISTRADOR_NEGOCIO se usa su negocio.
        </p>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <input
            className="rounded-md border p-2"
            placeholder="Puntos"
            value={puntos}
            onChange={(e) => setPuntos(e.target.value)}
          />
          <input
            className="rounded-md border p-2"
            placeholder="ID negocio (opcional para admin negocio)"
            value={negocioId}
            onChange={(e) => setNegocioId(e.target.value)}
          />
          <input
            className="rounded-md border p-2"
            type="datetime-local"
            value={fechaExpiracion}
            onChange={(e) => setFechaExpiracion(e.target.value)}
          />
          <button className="rounded-md bg-slate-900 p-2 text-white" type="submit">
            Generar
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Listado de codigos QR</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Negocio</th>
                <th className="p-2">Token</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Expira</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{row.id}</td>
                  <td className="p-2">{row.negocio_id}</td>
                  <td className="p-2 font-mono text-xs">{row.token}</td>
                  <td className="p-2">{row.puntos}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">{row.usuario_id ?? '-'}</td>
                  <td className="p-2">{row.fecha_expiracion ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
