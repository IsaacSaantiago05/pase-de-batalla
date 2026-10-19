import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Product = {
  id: number
  nombre: string
  precio: string
  puntos: number
  estado: boolean
}

type SaleItem = {
  producto_id: number | null
  nombre: string
  precio_unitario: string
  cantidad: number
  subtotal: string
  puntos_subtotal: number
}

type Sale = {
  id: number
  negocio_id: number
  total: string
  puntos_total: number
  items: SaleItem[]
  qr: { id: number; estado: string; fecha_expiracion: string | null; usuario_id: number | null } | null
  created_at: string
}

type QrImagePayload = {
  qr_id: number
  puntos: number
  data_url: string
}

type ListPayload<T> = T[] | { data: T[] }

function rowsOf<T>(payload: ListPayload<T>): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

export function SalesAdminPage() {
  const canSell = getAdminSession()?.role === 'ADMINISTRADOR_NEGOCIO'
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<Record<number, number>>({})
  const [qr, setQr] = useState<{ image: QrImagePayload; expiresAt: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadSales = async () => {
    try {
      const response = await apiGet<ListPayload<Sale>>('/sales')
      setSales(rowsOf(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar ventas')
    }
  }

  useEffect(() => {
    void loadSales()
    if (canSell) {
      apiGet<ListPayload<Product>>('/products')
        .then((response) => setProducts(rowsOf(response.data).filter((product) => product.estado)))
        .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar productos'))
    }
  }, [canSell])

  useEffect(() => {
    if (!qr) return
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((qr.expiresAt - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [qr])

  const lines = products.filter((product) => (cart[product.id] ?? 0) > 0)
  const total = lines.reduce((sum, product) => sum + Number(product.precio) * cart[product.id], 0)
  const points = lines.reduce((sum, product) => sum + product.puntos * cart[product.id], 0)

  function changeQuantity(productId: number, delta: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(100, (current[productId] ?? 0) + delta))
      return { ...current, [productId]: next }
    })
  }

  async function registerSale() {
    setError('')
    setSaving(true)

    try {
      const response = await apiPost<Sale>('/sales', {
        items: lines.map((product) => ({ producto_id: product.id, cantidad: cart[product.id] })),
      })
      const sale = response.data
      if (sale.qr) {
        const image = await apiGet<QrImagePayload>(`/qr/${sale.qr.id}/image`)
        const expiresAt = sale.qr.fecha_expiracion ? new Date(sale.qr.fecha_expiracion).getTime() : Date.now()
        setQr({ image: image.data, expiresAt })
      }
      setCart({})
      await loadSales()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  async function cancelQr() {
    if (!qr) return
    setError('')

    try {
      await apiPatch(`/qr/${qr.image.qr_id}/cancel`, {})
      setQr(null)
      await loadSales()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cancelar el QR')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Ventas</h1>
          <Link className="rounded-md border px-3 py-1 text-sm" to="/dashboard">
            Volver
          </Link>
        </div>

        {canSell ? (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div>
              <h2 className="mb-2 font-semibold">Productos</h2>
              {products.length === 0 && (
                <p className="text-sm text-slate-500">
                  No hay productos activos. Crea alguno en <Link className="underline" to="/products">/products</Link>.
                </p>
              )}
              <ul className="divide-y rounded-lg border">
                {products.map((product) => (
                  <li className="flex items-center justify-between gap-3 p-3" key={product.id}>
                    <div>
                      <p className="font-medium">{product.nombre}</p>
                      <p className="text-xs text-slate-500">${product.precio} · {product.puntos} pts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="h-8 w-8 rounded-md border" onClick={() => changeQuantity(product.id, -1)} type="button">-</button>
                      <span className="w-6 text-center">{cart[product.id] ?? 0}</span>
                      <button className="h-8 w-8 rounded-md border" onClick={() => changeQuantity(product.id, 1)} type="button">+</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              <h2 className="font-semibold">Resumen</h2>
              {lines.length === 0 && <p className="text-sm text-slate-500">Agrega productos a la venta.</p>}
              {lines.map((product) => (
                <p className="flex justify-between text-sm" key={product.id}>
                  <span>{cart[product.id]} × {product.nombre}</span>
                  <span>${(Number(product.precio) * cart[product.id]).toFixed(2)}</span>
                </p>
              ))}
              <p className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </p>
              <p className="flex justify-between text-sm text-emerald-700">
                <span>Puntos para el cliente</span>
                <span>{points}</span>
              </p>
              <button
                className="w-full rounded-md bg-slate-900 p-2 text-white disabled:opacity-50"
                disabled={lines.length === 0 || saving}
                onClick={() => {
                  void registerSale()
                }}
                type="button"
              >
                {saving ? 'Registrando...' : 'Registrar venta y generar QR'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Solo el administrador de cada negocio registra ventas. Aqui puedes consultar el historial.</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {qr && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold">Pide al cliente que escanee este QR</h2>
          <p className="mb-3 text-sm text-slate-600">{qr.image.puntos} puntos · un solo uso</p>
          <img
            alt={`QR ${qr.image.qr_id}`}
            className={`mx-auto h-72 w-72 rounded-lg border bg-white p-2 ${secondsLeft === 0 ? 'opacity-30' : ''}`}
            src={qr.image.data_url}
          />
          <p className={`mt-3 font-semibold ${secondsLeft === 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {secondsLeft > 0 ? `Expira en ${secondsLeft} s` : 'QR expirado'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {secondsLeft > 0 && (
              <button
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  void cancelQr()
                }}
                type="button"
              >
                Cancelar QR
              </button>
            )}
            <button className="rounded-md border px-3 py-1 text-sm" onClick={() => setQr(null)} type="button">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Historial de ventas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">#</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Productos</th>
                <th className="p-2">Total</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">QR</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr className="border-b" key={sale.id}>
                  <td className="p-2">{sale.id}</td>
                  <td className="p-2">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="p-2">{sale.items.map((item) => `${item.cantidad}× ${item.nombre}`).join(', ')}</td>
                  <td className="p-2">${sale.total}</td>
                  <td className="p-2">{sale.puntos_total}</td>
                  <td className="p-2">{sale.qr?.estado ?? '-'}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={6}>Sin ventas todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
