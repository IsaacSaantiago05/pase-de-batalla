import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Product = {
  id: number
  negocio_id: number
  nombre: string
  descripcion: string | null
  precio: string
  puntos: number
  estado: boolean
}

type ProductListPayload = Product[] | { data: Product[] }

export function ProductsAdminPage() {
  const canCreate = getAdminSession()?.role === 'ADMINISTRADOR_NEGOCIO'
  const [rows, setRows] = useState<Product[]>([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [puntos, setPuntos] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadProducts = async () => {
    try {
      const response = await apiGet<ProductListPayload>('/products')
      const payload = response.data
      setRows(Array.isArray(payload) ? payload : (payload.data ?? []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar productos')
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiPost('/products', {
        nombre,
        descripcion: descripcion.trim() || null,
        precio: Number(precio),
        puntos: Number(puntos),
      })
      setMessage('Producto creado correctamente.')
      setNombre('')
      setDescripcion('')
      setPrecio('')
      setPuntos('')
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el producto')
    }
  }

  async function toggleStatus(row: Product) {
    setMessage('')
    setError('')

    try {
      await apiPatch(`/products/${row.id}/status`, { estado: !row.estado })
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar estado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Productos</h1>
          <Link className="rounded-md border px-3 py-1 text-sm" to="/dashboard">
            Volver
          </Link>
        </div>
        {canCreate ? (
          <>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
              <input className="rounded-md border p-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <input className="rounded-md border p-2" placeholder="Precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
              <input className="rounded-md border p-2" placeholder="Puntos que otorga" inputMode="numeric" value={puntos} onChange={(e) => setPuntos(e.target.value)} />
              <button className="rounded-md bg-slate-900 p-2 text-white" type="submit">Crear</button>
            </form>
            <textarea
              className="mt-3 w-full rounded-md border p-2"
              placeholder="Descripcion (opcional)"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </>
        ) : (
          <p className="text-sm text-slate-600">El administrador general puede ver y activar o desactivar productos; solo cada negocio los crea.</p>
        )}
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Listado</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Negocio</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Precio</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Accion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b" key={row.id}>
                  <td className="p-2">{row.negocio_id}</td>
                  <td className="p-2">{row.nombre}</td>
                  <td className="p-2">${row.precio}</td>
                  <td className="p-2">{row.puntos}</td>
                  <td className="p-2">{row.estado ? 'ACTIVO' : 'INACTIVO'}</td>
                  <td className="p-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        void toggleStatus(row)
                      }}
                      type="button"
                    >
                      {row.estado ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={6}>Sin productos todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
