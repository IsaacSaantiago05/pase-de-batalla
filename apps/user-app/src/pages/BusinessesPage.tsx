import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, listData } from '../lib/api'

type Business = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  productos_activos: number
}

type Product = {
  id: number
  nombre: string
  descripcion: string | null
  precio: string
  puntos: number
}

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Business[]>('/directory/businesses')
      .then((response) => setBusinesses(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar negocios'))
  }, [])

  async function openBusiness(business: Business) {
    setSelected(business)
    setProducts([])
    setError('')
    setLoadingProducts(true)

    try {
      const response = await apiGet<Product[]>(`/products?negocio_id=${business.id}`)
      setProducts(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar productos')
    } finally {
      setLoadingProducts(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Negocios participantes</h1>
          <Link className="rounded-md border px-3 py-1 text-sm" to="/home">
            Volver
          </Link>
        </div>
        <p className="mb-4 text-sm text-slate-600">Compra en cualquiera de estos negocios y escanea el QR de tu compra para ganar puntos.</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {businesses.map((business) => (
            <button
              className={`rounded-lg border p-4 text-left hover:border-slate-400 ${selected?.id === business.id ? 'border-slate-900' : 'border-slate-200'}`}
              key={business.id}
              onClick={() => {
                void openBusiness(business)
              }}
              type="button"
            >
              <h2 className="text-lg font-semibold text-slate-900">{business.nombre}</h2>
              <p className="mt-1 text-sm text-slate-600">{business.descripcion ?? 'Sin descripcion'}</p>
              {business.direccion && <p className="mt-2 text-xs text-slate-500">{business.direccion}</p>}
              {business.telefono && <p className="text-xs text-slate-500">Tel. {business.telefono}</p>}
              <p className="mt-2 text-xs font-medium text-emerald-700">{business.productos_activos} productos con puntos</p>
            </button>
          ))}
          {businesses.length === 0 && !error && <p className="text-sm text-slate-500">Aun no hay negocios participantes.</p>}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Productos de {selected.nombre}</h2>
          {loadingProducts && <p className="text-sm text-slate-500">Cargando...</p>}
          {!loadingProducts && products.length === 0 && <p className="text-sm text-slate-500">Este negocio aun no tiene productos.</p>}
          <ul className="divide-y">
            {products.map((product) => (
              <li className="flex items-center justify-between gap-3 py-3" key={product.id}>
                <div>
                  <p className="font-medium">{product.nombre}</p>
                  {product.descripcion && <p className="text-xs text-slate-500">{product.descripcion}</p>}
                </div>
                <div className="text-right text-sm">
                  <p>${product.precio}</p>
                  <p className="font-semibold text-emerald-700">+{product.puntos} pts</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
