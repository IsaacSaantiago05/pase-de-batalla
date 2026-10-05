import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { clearAdminSession } from '../lib/auth'

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

type QrImagePayload = {
  qr_id: number
  token: string
  negocio_id: number
  estado: 'ACTIVO' | 'UTILIZADO' | 'EXPIRADO' | 'CANCELADO'
  puntos: number
  svg: string
  data_url: string
}

export function QrManagementPage() {
  const [rows, setRows] = useState<QrCode[]>([])
  const [puntos, setPuntos] = useState('')
  const [negocioId, setNegocioId] = useState('')
  const [fechaExpiracion, setFechaExpiracion] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [qrPreview, setQrPreview] = useState<QrImagePayload | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null)

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
      await onPreviewQr(response.data.id)
      setPuntos('')
      setNegocioId('')
      setFechaExpiracion('')
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar QR')
    }
  }

  async function onPreviewQr(qrId: number) {
    setError('')
    setLoadingPreviewId(qrId)

    try {
      const response = await apiGet<QrImagePayload>(`/qr/${qrId}/image`)
      setQrPreview(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar la imagen QR')
    } finally {
      setLoadingPreviewId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap gap-2 text-sm">
            {['/dashboard', '/qr', '/points', '/rewards', '/redemptions'].map((route) => (
              <Link className="rounded-md border px-2 py-1" key={route} to={route}>
                {route}
              </Link>
            ))}
          </nav>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              clearAdminSession()
              location.href = '/login'
            }}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

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
                <th className="p-2">Acciones</th>
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
                  <td className="p-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      type="button"
                      onClick={() => {
                        void onPreviewQr(row.id)
                      }}
                    >
                      {loadingPreviewId === row.id ? 'Cargando...' : 'Ver QR'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {qrPreview && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">QR #{qrPreview.qr_id}</h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setQrPreview(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[300px_1fr]">
            <img alt={`QR ${qrPreview.qr_id}`} className="h-[360px] w-[360px] rounded-lg border border-slate-200 bg-white p-2" src={qrPreview.data_url} />
            <div className="space-y-2 text-sm text-slate-700">
              <p>Token: <span className="font-mono text-xs text-slate-900">{qrPreview.token}</span></p>
              <p>Puntos: <span className="font-semibold text-slate-900">{qrPreview.puntos}</span></p>
              <p>Estado: <span className="font-semibold text-slate-900">{qrPreview.estado}</span></p>
              <p>Negocio: <span className="font-semibold text-slate-900">{qrPreview.negocio_id}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
