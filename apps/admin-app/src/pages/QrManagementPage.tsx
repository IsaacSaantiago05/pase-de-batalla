import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, InputField, Notice, StatusChip, formatDate } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
import { apiGet, apiPost, listData } from '../lib/api'

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
  const [message, setMessage] = useState('')
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

      const response = await apiPost<GeneratedQrPayload>('/qr/generate', payload)
      setMessage(`QR generado: ${response.data.token}`)
      await onPreviewQr(response.data.id)
      setPuntos('')
      setNegocioId('')
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
    <AdminPage title="CÓDIGOS QR">
      <div className="pb-card flex flex-col gap-4 rounded-2xl p-5">
        <div>
          <p className="font-display text-base font-bold tracking-wide text-white">Generar código QR</p>
          <p className="mt-1 text-xs text-white/40">
            Para ADMINISTRADOR_GENERAL el campo negocio es obligatorio. Para ADMINISTRADOR_NEGOCIO se usa su negocio. El QR expira automaticamente en 30 segundos.
          </p>
        </div>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={onSubmit}>
          <InputField inputMode="numeric" label="Puntos" onChange={(e) => setPuntos(e.target.value)} placeholder="Puntos" value={puntos} />
          <InputField inputMode="numeric" label="ID negocio" onChange={(e) => setNegocioId(e.target.value)} placeholder="Opcional para admin negocio" value={negocioId} />
          <Button className="tracking-widest" type="submit">
            GENERAR
          </Button>
        </form>
        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      {qrPreview && (
        <div className="pb-card flex flex-col gap-4 rounded-2xl p-5 anim-scale-in">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold tracking-wide text-white">QR #{qrPreview.qr_id}</p>
            <button className="font-display text-xs font-semibold tracking-wide text-white/40 hover:text-white/70" onClick={() => setQrPreview(null)} type="button">
              Cerrar
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            {/* El QR conserva fondo blanco para que la camara lo lea bien. */}
            <img alt={`QR ${qrPreview.qr_id}`} className="mx-auto aspect-square w-full max-w-[280px] rounded-xl bg-white p-2" src={qrPreview.data_url} />
            <div className="flex flex-col gap-2 text-sm text-white/60">
              <p>
                Token: <span className="font-mono-game text-xs text-white">{qrPreview.token}</span>
              </p>
              <p>
                Puntos: <span className="font-mono-game font-bold text-yellow-400">{qrPreview.puntos}</span>
              </p>
              <p className="flex items-center gap-2">
                Estado: <StatusChip status={qrPreview.estado} />
              </p>
              <p>
                Negocio: <span className="font-semibold text-white">{qrPreview.negocio_id}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <TableCard title="Listado de códigos QR">
        <table className="pb-table">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Token</th>
              <th>Puntos</th>
              <th>Estado</th>
              <th>Usuario</th>
              <th>Expira</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.negocio_id}</td>
                <td className="font-mono-game text-xs">{row.token}</td>
                <td className="font-mono-game text-yellow-400">{row.puntos}</td>
                <td>
                  <StatusChip status={row.estado} />
                </td>
                <td>{row.usuario_id ?? '-'}</td>
                <td>{formatDate(row.fecha_expiracion, true)}</td>
                <td>
                  <button
                    className="rounded-lg px-3 py-1 font-display text-xs font-bold tracking-wide text-white/70"
                    onClick={() => {
                      void onPreviewQr(row.id)
                    }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    type="button"
                  >
                    {loadingPreviewId === row.id ? 'Cargando...' : 'Ver QR'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-4 text-center text-sm text-white/30">Sin códigos QR todavía.</p>}
      </TableCard>
    </AdminPage>
  )
}
