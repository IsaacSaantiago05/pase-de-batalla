import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, ChipButton, FieldLabel, FilterTabs, GlowButton, InputField, Notice, SectionTitle, StatusChip, formatDate, formatPoints } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
import { apiGet, apiPatch, apiPost, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'
import { SALE_MAX } from '../lib/limits'

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

// Unidades maximas de un mismo producto en una compra (el mismo limite que aplica la API).
const MAX_UNITS = 100

// "2× Taco, Orden de Tacos": asi se nombra una compra en la vista del QR y en el listado.
const describeItems = (items: { nombre: string; cantidad: number }[]) =>
  items.map((item) => (item.cantidad > 1 ? `${item.cantidad}× ${item.nombre}` : item.nombre)).join(', ')

type ListView = 'utiles' | 'sin_uso' | 'todos'

// Vistas del listado. Por defecto no se muestran los QR que nadie canjeo, para que no lo saturen.
const LIST_VIEWS: { key: ListView; label: string; query: string; empty: string }[] = [
  { key: 'utiles', label: 'Activos y canjeados', query: '?estado=ACTIVO,UTILIZADO', empty: 'Sin códigos activos ni canjeados todavía.' },
  { key: 'sin_uso', label: 'Expirados y cancelados', query: '?estado=EXPIRADO,CANCELADO', empty: 'Sin códigos expirados ni cancelados.' },
  { key: 'todos', label: 'Todos', query: '', empty: 'Sin códigos QR todavía.' },
]

function conceptOf(row: QrCode) {
  if (!row.productos || row.productos.length === 0) return FREE_POINTS

  return describeItems(row.productos)
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
  // Que se esta haciendo: generar por puntos, generar la compra o cancelar el QR que se muestra.
  const [busy, setBusy] = useState<'free' | 'cart' | 'cancel' | null>(null)
  // Compra en curso del negocio: id de producto -> unidades. Toda la compra sale en un solo QR.
  const [cart, setCart] = useState<Record<number, number>>({})
  const previewRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ListView>('utiles')
  const currentView = LIST_VIEWS.find((option) => option.key === view) ?? LIST_VIEWS[0]

  const lines = products.filter((product) => (cart[product.id] ?? 0) > 0)
  const cartPoints = lines.reduce((sum, product) => sum + product.puntos * cart[product.id], 0)
  const cartUnits = lines.reduce((sum, product) => sum + cart[product.id], 0)
  // Tope por venta (la API tambien lo aplica). Una sola unidad de un producto siempre se puede vender.
  const overLimit = cartPoints > SALE_MAX && cartUnits > 1

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

  // El QR dura 30 segundos: al mostrarlo se lleva a la vista para que el cliente lo escanee sin buscarlo.
  useEffect(() => {
    if (!preview) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    previewRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
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

  // Suma o quita unidades de un producto en la compra; al llegar a 0 sale de la lista.
  function changeQuantity(productId: number, delta: number) {
    setMessage('')
    setError('')
    setCart((current) => {
      const quantity = Math.max(0, Math.min(MAX_UNITS, (current[productId] ?? 0) + delta))
      const next = { ...current, [productId]: quantity }
      if (quantity === 0) delete next[productId]

      return next
    })
  }

  // Toda la compra en un solo QR: lleva la suma de los puntos que cada producto tiene asignados (los decide el servidor).
  async function generateFromCart() {
    if (lines.length === 0 || overLimit) return
    setMessage('')
    setError('')
    setBusy('cart')

    const items = lines.map((product) => ({ producto_id: product.id, nombre: product.nombre, cantidad: cart[product.id] }))

    try {
      const response = await apiPost<Sale>('/sales', { items: items.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })) })
      const qr = response.data.qr
      if (!qr) throw new Error('No fue posible generar el QR de la compra')

      setCart({})
      setMessage(`QR generado: ${qr.puntos} puntos por ${cartUnits} ${cartUnits === 1 ? 'producto' : 'productos'}.`)
      await showQr(qr, describeItems(items))
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible generar el QR de la compra')
    } finally {
      setBusy(null)
    }
  }

  // Cancela el QR que se esta mostrando (por ejemplo, si se armo mal la compra) para que nadie lo canjee.
  async function cancelQr() {
    if (!preview) return
    setMessage('')
    setError('')
    setBusy('cancel')

    try {
      await apiPatch(`/qr/${preview.image.qr_id}/cancel`, {})
      setPreview(null)
      setMessage('QR cancelado: ya no se puede canjear.')
      await loadQrCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cancelar el QR')
    } finally {
      setBusy(null)
    }
  }

  // QR por cantidad libre de puntos: solo el administrador general (la API tambien lo restringe).
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    const points = Number(puntos)
    if (!Number.isInteger(points) || points < 1) {
      setError('Escribe cuántos puntos dará el QR (número entero mayor a 0).')
      return
    }
    if (!negocioId) {
      setError('Elige el negocio para el que se genera el QR.')
      return
    }

    setBusy('free')

    try {
      const response = await apiPost<QrCode>('/qr/generate', { puntos: points, negocio_id: Number(negocioId) })

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
              : 'Toca los productos que compró el cliente (cada toque suma uno) y genera un solo QR por toda la compra. El QR expira automáticamente en 30 segundos.'}
          </p>
        </div>

        {!isGeneral && (
          <div className="flex flex-col gap-3">
            <SectionTitle className="text-white/40">Productos</SectionTitle>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {products.map((product) => {
                const quantity = cart[product.id] ?? 0

                return (
                  <button
                    aria-label={`Agregar ${product.nombre}, ${product.puntos} puntos${quantity > 0 ? ` (llevas ${quantity})` : ''}`}
                    className="relative flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy !== null || quantity >= MAX_UNITS}
                    key={product.id}
                    onClick={() => changeQuantity(product.id, 1)}
                    style={{
                      background: `linear-gradient(135deg, rgba(245,158,11,${quantity > 0 ? 0.28 : 0.14}), #111827)`,
                      border: `1px solid rgba(245,158,11,${quantity > 0 ? 0.8 : 0.35})`,
                    }}
                    type="button"
                  >
                    <span className="w-full truncate font-display text-sm font-bold text-white">{product.nombre}</span>
                    <span className="font-mono-game text-xs font-bold text-yellow-400">{product.puntos} pts</span>
                    {/* Unidades de este producto que ya estan en la compra. */}
                    {quantity > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono-game text-xs font-bold"
                        style={{ background: '#f59e0b', color: '#1c1300' }}
                      >
                        {quantity}
                      </span>
                    )}
                  </button>
                )
              })}
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

            {lines.length > 0 && (
              <section aria-label="Compra del cliente" className="flex flex-col gap-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle className="text-white/40">Compra del cliente</SectionTitle>
                  <ChipButton disabled={busy !== null} onClick={() => setCart({})}>
                    Vaciar
                  </ChipButton>
                </div>

                <ul className="flex flex-col gap-3">
                  {lines.map((product) => (
                    <li className="flex items-center gap-3" key={product.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{product.nombre}</p>
                        <p className="font-mono-game text-xs text-white/40">
                          {cart[product.id]} × {product.puntos} = <span className="text-yellow-400">{formatPoints(product.puntos * cart[product.id])} pts</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          aria-label={`Quitar un ${product.nombre}`}
                          className="h-10 w-10 rounded-xl font-display text-lg font-bold text-white transition-all active:scale-90 disabled:opacity-40"
                          disabled={busy !== null}
                          onClick={() => changeQuantity(product.id, -1)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                          type="button"
                        >
                          −
                        </button>
                        <span aria-live="polite" className="w-8 text-center font-mono-game text-base font-bold text-white">
                          {cart[product.id]}
                        </span>
                        <button
                          aria-label={`Agregar un ${product.nombre}`}
                          className="h-10 w-10 rounded-xl font-display text-lg font-bold text-white transition-all active:scale-90 disabled:opacity-40"
                          disabled={busy !== null || cart[product.id] >= MAX_UNITS}
                          onClick={() => changeQuantity(product.id, 1)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="font-display text-sm font-bold text-white">
                    Puntos para el cliente
                    <span className="ml-2 font-normal text-white/40">
                      {cartUnits} {cartUnits === 1 ? 'producto' : 'productos'}
                    </span>
                  </span>
                  <span className="font-mono-game text-xl font-bold text-yellow-400">{formatPoints(cartPoints)}</span>
                </div>

                {overLimit && (
                  <Notice tone="error">
                    Un QR no puede dar más de {SALE_MAX} puntos. Quita productos y genera otro QR con el resto de la compra.
                  </Notice>
                )}

                <GlowButton className="w-full tracking-widest" compact disabled={busy !== null || overLimit} onClick={() => void generateFromCart()}>
                  {busy === 'cart' ? 'GENERANDO...' : 'GENERAR QR'}
                </GlowButton>
              </section>
            )}
          </div>
        )}

        {isGeneral && (
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={onSubmit}>
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
            <InputField inputMode="numeric" label="Puntos" onChange={(e) => setPuntos(e.target.value)} placeholder="Puntos" value={puntos} />
            <Button className="tracking-widest" disabled={busy !== null} type="submit">
              {busy === 'free' ? 'GENERANDO...' : 'GENERAR'}
            </Button>
          </form>
        )}
        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>

      {preview && (
        <div className="pb-card flex flex-col gap-4 rounded-2xl p-5 anim-scale-in" ref={previewRef}>
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words font-display text-base font-bold tracking-wide text-white">
              QR #{preview.image.qr_id} · {preview.concept}
            </p>
            <button className="shrink-0 font-display text-xs font-semibold tracking-wide text-white/40 hover:text-white/70" onClick={() => setPreview(null)} type="button">
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
              {/* Mientras siga vigente se puede anular, por ejemplo si la compra se armo mal. */}
              {previewActive && !previewExpired && (
                <ChipButton className="mt-1 self-start" disabled={busy !== null} onClick={() => void cancelQr()} tone="red">
                  {busy === 'cancel' ? 'Cancelando...' : 'Cancelar QR'}
                </ChipButton>
              )}
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
