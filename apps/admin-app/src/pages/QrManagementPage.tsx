import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, FieldLabel, FilterTabs, InputField, Notice, SectionTitle, StatusChip, formatDate } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
import { apiGet, apiPost, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type QrStatus = 'ACTIVO' | 'UTILIZADO' | 'EXPIRADO' | 'CANCELADO'

type QrCode = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  // Productos que originaron el QR; vacio si se genero por cantidad de puntos.
  productos?: { nombre: string; cantidad: number }[]
  token: string
  puntos: number
  estado: QrStatus
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
  estado: QrStatus
  puntos: number
  svg: string
  data_url: string
}

type Product = { id: number; nombre: string; puntos: number; estado: boolean }
type Business = { id: number; nombre: string; estado: boolean }
type Sale = { id: number; qr: QrCode | null }

type QrPreview = {
  image: QrImagePayload
  concept: string
  // Momento en que vence, para la cuenta regresiva (null si el QR no tiene vigencia).
  expiresAt: number | null
}

const FREE_POINTS = 'Puntos libres'

type ListView = 'utiles' | 'sin_uso' | 'todos'

// Vistas del listado. Por defecto no se muestran los QR que nadie canjeo, para que no lo saturen.
const LIST_VIEWS: { key: ListView; label: string; query: string; empty: string }[] = [
  { key: 'utiles', label: 'Activos y canjeados', query: '?estado=ACTIVO,UTILIZADO', empty: 'Sin códigos activos ni canjeados todavía.' },
  { key: 'sin_uso', label: 'Expirados y cancelados', query: '?estado=EXPIRADO,CANCELADO', empty: 'Sin códigos expirados ni cancelados.' },
  { key: 'todos', label: 'Todos', query: '', empty: 'Sin códigos QR todavía.' },
]

function conceptOf(row: QrCode) {
  if (!row.productos || row.productos.length === 0) return FREE_POINTS

  return row.productos.map((item) => (item.cantidad > 1 ? `${item.cantidad}× ${item.nombre}` : item.nombre)).join(', ')
}

const expirationOf = (value: string | null) => (value ? new Date(value).getTime() : null)

// Un QR sigue guardado como ACTIVO hasta que alguien intenta usarlo; si ya vencio se muestra como expirado.
function statusOf(row: QrCode): QrStatus {
  const expiresAt = expirationOf(row.fecha_expiracion)

  return row.estado === 'ACTIVO' && expiresAt !== null && expiresAt <= Date.now() ? 'EXPIRADO' : row.estado
}

export function QrManagementPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [rows, setRows] = useState<QrCode[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [puntos, setPuntos] = useState('')
  const [negocioId, setNegocioId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<QrPreview | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null)
  // 'free' mientras se genera por puntos, o el id del producto que se esta generando.
  const [busy, setBusy] = useState<'free' | number | null>(null)
  const [view, setView] = useState<ListView>('utiles')
  const currentView = LIST_VIEWS.find((option) => option.key === view) ?? LIST_VIEWS[0]

  const loadQrCodes = async (query = currentView.query) => {
    try {
      const response = await apiGet<QrListPayload>(`/qr${query}`)
      setRows(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar codigos QR')
    }
  }

  useEffect(() => {
    void loadQrCodes(currentView.query)
    // Solo se recarga al cambiar de vista.
  }, [view])

  useEffect(() => {
    if (isGeneral) {
      // El administrador general elige el negocio por nombre.
      apiGet<Business[]>('/businesses')
        .then((response) => setBusinesses(listData(response.data).filter((business) => business.estado)))
        .catch(() => setBusinesses([]))
    } else {
      // El administrador de negocio genera con un toque desde sus productos activos.
      apiGet<Product[]>('/products?activos=1&per_page=100')
        .then((response) => setProducts([...listData(response.data)].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))))
        .catch(() => setProducts([]))
    }
  }, [isGeneral])

  useEffect(() => {
    const expiresAt = preview?.expiresAt
    if (!expiresAt) return

    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 500)

    return () => window.clearInterval(timer)
  }, [preview])

  async function showQr(qr: Pick<QrCode, 'id' | 'fecha_expiracion'>, concept: string) {
    setLoadingPreviewId(qr.id)

    try {
      const response = await apiGet<QrImagePayload>(`/qr/${qr.id}/image`)
      setPreview({ image: response.data, concept, expiresAt: expirationOf(qr.fecha_expiracion) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar la imagen QR')
    } finally {
      setLoadingPreviewId(null)
    }
  }

  // Un producto: el QR lleva los puntos que el producto tiene asignados (los decide el servidor).
  async function generateFromProduct(product: Product) {
    setMessage('')
    setError('')
    setBusy(product.id)

    try {
      const response = await apiPost<Sale>('/sales', { items: [{ producto_id: product.id, cantidad: 1 }] })
      const qr = response.data.qr
      if (!qr) throw new Error('No fue posible generar el QR del producto')

      setMessage(`QR de ${product.nombre} generado: ${qr.puntos} puntos.`)
      await showQr(qr, product.nombre)
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar el QR del producto')
    } finally {
      setBusy(null)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    const points = Number(puntos)
    if (!Number.isInteger(points) || points < 1) {
      setError('Escribe cuántos puntos dará el QR (número entero mayor a 0).')
      return
    }
    if (isGeneral && !negocioId) {
      setError('Elige el negocio para el que se genera el QR.')
      return
    }

    setBusy('free')

    try {
      // El administrador de negocio no envia negocio: el servidor usa el suyo.
      const payload = isGeneral ? { puntos: points, negocio_id: Number(negocioId) } : { puntos: points }
      const response = await apiPost<QrCode>('/qr/generate', payload)

      setMessage(`QR generado: ${response.data.puntos} puntos.`)
      await showQr(response.data, FREE_POINTS)
      setPuntos('')
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar QR')
    } finally {
      setBusy(null)
    }
  }

  const previewActive = preview?.image.estado === 'ACTIVO' && preview.expiresAt !== null
  const previewExpired = previewActive && secondsLeft === 0

  return (
    <AdminPage title="CÓDIGOS QR">
      <div className="pb-card flex flex-col gap-4 rounded-2xl p-5">
        <div>
          <p className="font-display text-base font-bold tracking-wide text-white">Generar código QR</p>
          <p className="mt-1 text-xs text-white/40">
            {isGeneral
              ? 'Elige el negocio y los puntos. El QR expira automáticamente en 30 segundos.'
              : 'Toca un producto para generar su QR con los puntos que tiene asignados. El QR expira automáticamente en 30 segundos.'}
          </p>
        </div>

        {!isGeneral && (
          <div className="flex flex-col gap-3">
            <SectionTitle className="text-white/40">Productos</SectionTitle>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {products.map((product) => (
                <button
                  className="flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy !== null}
                  key={product.id}
                  onClick={() => void generateFromProduct(product)}
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.14), #111827)', border: '1px solid rgba(245,158,11,0.35)' }}
                  type="button"
                >
                  <span className="w-full truncate font-display text-sm font-bold text-white">{product.nombre}</span>
                  <span className="font-mono-game text-xs font-bold text-yellow-400">{busy === product.id ? 'Generando...' : `${product.puntos} pts`}</span>
                </button>
              ))}
            </div>
            {products.length === 0 && (
              <p className="text-sm text-white/40">
                Aún no tienes productos activos. Créalos en{' '}
                <Link className="font-semibold text-yellow-400 underline" to="/products">
                  Productos
                </Link>{' '}
                y aparecerán aquí como botones.
              </p>
            )}
            <SectionTitle className="mt-1 text-white/40">Otra cantidad de puntos</SectionTitle>
          </div>
        )}

        <form className={`grid gap-3 md:items-end ${isGeneral ? 'md:grid-cols-[1fr_1fr_auto]' : 'md:grid-cols-[1fr_auto]'}`} onSubmit={onSubmit}>
          {isGeneral && (
            <div>
              <FieldLabel htmlFor="qr-business">Negocio</FieldLabel>
              <select className="pb-input" id="qr-business" onChange={(e) => setNegocioId(e.target.value)} value={negocioId}>
                <option value="">Elige un negocio</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <InputField inputMode="numeric" label="Puntos" onChange={(e) => setPuntos(e.target.value)} placeholder="Puntos" value={puntos} />
          <Button className="tracking-widest" disabled={busy !== null} type="submit">
            {busy === 'free' ? 'GENERANDO...' : 'GENERAR'}
          </Button>
        </form>
        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      {preview && (
        <div className="pb-card flex flex-col gap-4 rounded-2xl p-5 anim-scale-in">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold tracking-wide text-white">
              QR #{preview.image.qr_id} · {preview.concept}
            </p>
            <button className="font-display text-xs font-semibold tracking-wide text-white/40 hover:text-white/70" onClick={() => setPreview(null)} type="button">
              Cerrar
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            {/* El QR conserva fondo blanco para que la camara lo lea bien. */}
            <img
              alt={`QR ${preview.image.qr_id}`}
              className={`mx-auto aspect-square w-full max-w-[280px] rounded-xl bg-white p-2 ${previewExpired ? 'opacity-30' : ''}`}
              src={preview.image.data_url}
            />
            <div className="flex flex-col gap-2 text-sm text-white/60">
              {previewActive && (
                <p className={`font-display text-base font-bold ${previewExpired ? 'text-red-400' : 'text-white'}`}>
                  {previewExpired ? 'QR expirado: genera uno nuevo' : `Expira en ${secondsLeft} s`}
                </p>
              )}
              <p>
                Puntos: <span className="font-mono-game font-bold text-yellow-400">{preview.image.puntos}</span>
              </p>
              <p className="flex items-center gap-2">
                Estado: <StatusChip status={previewExpired ? 'EXPIRADO' : preview.image.estado} />
              </p>
              <p>
                Token: <span className="break-all font-mono-game text-xs text-white">{preview.image.token}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <FilterTabs onChange={setView} options={LIST_VIEWS} value={view} />

      <TableCard title="Listado de códigos QR">
        <table className="pb-table">
          <thead>
            <tr>
              {isGeneral && <th>Negocio</th>}
              <th>Concepto</th>
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
                {isGeneral && <td>{row.negocio_nombre ?? `#${row.negocio_id}`}</td>}
                <td>{conceptOf(row)}</td>
                <td className="font-mono-game text-yellow-400">{row.puntos}</td>
                <td>
                  {statusOf(row) === 'UTILIZADO' ? <StatusChip label="Canjeado" status="USADO" /> : <StatusChip status={statusOf(row)} />}
                </td>
                <td>{row.usuario_id ?? '-'}</td>
                <td>{formatDate(row.fecha_expiracion, true)}</td>
                <td>
                  <button
                    className="rounded-lg px-3 py-1 font-display text-xs font-bold tracking-wide text-white/70"
                    onClick={() => {
                      setError('')
                      void showQr(row, conceptOf(row))
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
        {rows.length === 0 && <p className="py-4 text-center text-sm text-white/30">{currentView.empty}</p>}
      </TableCard>
      <p className="text-xs text-white/30">
        Se muestran los 20 más recientes. Los códigos que nadie canjeó (expirados o cancelados) se eliminan solos a los 30 días; los canjeados se conservan.
      </p>
    </AdminPage>
  )
}
