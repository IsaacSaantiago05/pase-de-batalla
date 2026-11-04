import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, listData } from '../lib/api'
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
  const [error, setError] = useState('')
  const [qrPreview, setQrPreview] = useState<QrImagePayload | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null)

  const loadQrCodes = async () => {
    try {
      const response = await apiGet<QrListPayload>('/qr')
      setRows(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar codigos QR')
    }
  }

  useEffect(() => {
    void loadQrCodes()
  }, [])

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
    <div className="space-y-6 px-5 py-5">
      <div className="pb-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap gap-2 text-sm">
            {['/dashboard', '/qr', '/points', '/rewards', '/redemptions'].map((route) => (
              <Link className="rounded-md border px-2 py-1 border-white/10" key={route} to={route}>
                {route}
              </Link>
            ))}
          </nav>
          <button
            className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 font-display font-bold tracking-wider text-[#0d0a00] px-3 py-2 text-sm"
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

      <div className="pb-card rounded-2xl p-6">
        <h2 className="mb-3 text-xl font-semibold font-display tracking-wider text-white">Codigos QR</h2>
        <p className="text-sm text-white/60">
          Los QR ya no se generan a mano: cada venta registrada en{' '}
          <Link className="underline" to="/sales">
            /sales
          </Link>{' '}
          crea su QR con los puntos de sus productos. El QR expira automaticamente en 1 minuto.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="pb-card rounded-2xl p-6">
        <h2 className="mb-3 text-xl font-semibold font-display tracking-wider text-white">Listado de codigos QR</h2>
        <div className="overflow-x-auto">
          <table className="pb-table">
            <thead>
              <tr>
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
                <tr key={row.id}>
                  <td className="p-2">{row.negocio_id}</td>
                  <td className="p-2 font-mono text-xs">{row.token}</td>
                  <td className="p-2">{row.puntos}</td>
                  <td className="p-2">{row.estado}</td>
                  <td className="p-2">{row.usuario_id ?? '-'}</td>
                  <td className="p-2">{row.fecha_expiracion ?? '-'}</td>
                  <td className="p-2">
                    <button
                      className="rounded-md border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/5"
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
        <div className="pb-card rounded-2xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold font-display tracking-wider text-white">QR #{qrPreview.qr_id}</h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/5"
                onClick={() => setQrPreview(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[300px_1fr]">
            <img alt={`QR ${qrPreview.qr_id}`} className="h-[360px] w-[360px] rounded-lg border border-white/10 bg-white p-2" src={qrPreview.data_url} />
            <div className="space-y-2 text-sm text-white/70">
              <p>Token: <span className="font-mono text-xs text-white">{qrPreview.token}</span></p>
              <p>Puntos: <span className="font-semibold text-white">{qrPreview.puntos}</span></p>
              <p>Estado: <span className="font-semibold text-white">{qrPreview.estado}</span></p>
              <p>Negocio: <span className="font-semibold text-white">{qrPreview.negocio_id}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
