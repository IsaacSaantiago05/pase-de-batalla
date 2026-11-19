import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiPut } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Product = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  nombre: string
  descripcion: string | null
  puntos: number
  estado: boolean
  // Fecha en que se eliminara por llevar 7 dias inactivo; null si esta activo.
  se_elimina_en?: string | null
}

type ProductListPayload = Product[] | { data: Product[] }

type Draft = { id: number; nombre: string; puntos: string }

const smallButton = 'rounded-md border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/5 disabled:opacity-40'

const DAY_MS = 24 * 60 * 60 * 1000

function deletionNotice(date: string) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS)

  return days <= 1 ? 'Se elimina en menos de 1 día' : `Se elimina en ${days} días`
}

// El negocio crea sus productos y los activa o desactiva; nombre y puntos solo los corrige el administrador general.
export function ProductsAdminPage() {
  const role = getAdminSession()?.role
  const canCreate = role === 'ADMINISTRADOR_NEGOCIO'
  const canEdit = role === 'ADMINISTRADOR_GENERAL'
  const [rows, setRows] = useState<Product[]>([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadProducts = async () => {
    try {
      const response = await apiGet<ProductListPayload>('/products?per_page=100')
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
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        puntos: Number(puntos),
      })
      setMessage('Producto creado correctamente. Ya aparece como botón en Códigos QR.')
      setNombre('')
      setDescripcion('')
      setPuntos('')
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el producto')
    }
  }

  async function saveDraft() {
    if (!draft) return
    setMessage('')
    setError('')

    const points = Number(draft.puntos)
    if (draft.nombre.trim() === '') {
      setError('El nombre del producto es obligatorio.')
      return
    }
    if (!Number.isInteger(points) || points < 1) {
      setError('Los puntos deben ser un número entero mayor a 0.')
      return
    }

    setSaving(true)

    try {
      await apiPut(`/products/${draft.id}`, { nombre: draft.nombre.trim(), puntos: points })
      setMessage('Producto actualizado correctamente.')
      setDraft(null)
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el producto')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(row: Product) {
    setMessage('')
    setError('')

    try {
      await apiPatch(`/products/${row.id}/status`, { estado: !row.estado })
      setMessage(
        row.estado
          ? `${row.nombre} quedó inactivo: ya no genera QR y se eliminará en 7 días si no se reactiva.`
          : `${row.nombre} quedó activo.`,
      )
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar estado')
    }
  }

  return (
    <div className="space-y-6 px-5 py-5">
      <div className="pb-card rounded-2xl p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold font-display tracking-wider text-white">Productos</h1>
          <Link className="rounded-md border px-3 py-1 text-sm border-white/10" to="/dashboard">
            Volver
          </Link>
        </div>
        {canCreate ? (
          <>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
              <input className="pb-input" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <input className="pb-input" placeholder="Puntos que otorga" inputMode="numeric" value={puntos} onChange={(e) => setPuntos(e.target.value)} />
              <button className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 font-display font-bold tracking-wider text-[#0d0a00] p-2" type="submit">Crear</button>
            </form>
            <textarea
              className="pb-input mt-3 w-full"
              placeholder="Descripcion (opcional)"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <p className="mt-3 text-xs text-white/40">
              Cada producto activo aparece como botón en Códigos QR. Un producto inactivo se elimina solo a los 7 días. Si hay un error en el nombre o los puntos, pide la corrección al administrador general.
            </p>
          </>
        ) : (
          <p className="text-sm text-white/60">
            Cada negocio crea sus productos. Aquí puedes corregir el nombre y los puntos, o activarlos y desactivarlos. Un producto inactivo se elimina solo a los 7 días.
          </p>
        )}
        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="pb-card rounded-2xl p-6">
        <h2 className="mb-3 text-xl font-semibold font-display tracking-wider text-white">Listado</h2>
        <div className="overflow-x-auto">
          <table className="pb-table">
            <thead>
              <tr>
                {canEdit && <th className="p-2">Negocio</th>}
                <th className="p-2">Nombre</th>
                <th className="p-2">Puntos</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const editing = draft?.id === row.id

                return (
                  <tr key={row.id}>
                    {canEdit && <td className="p-2">{row.negocio_nombre ?? `#${row.negocio_id}`}</td>}
                    <td className="p-2">
                      {editing ? (
                        <input
                          aria-label="Nombre del producto"
                          className="pb-input min-w-40"
                          maxLength={150}
                          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                          value={draft.nombre}
                        />
                      ) : (
                        row.nombre
                      )}
                    </td>
                    <td className="p-2">
                      {editing ? (
                        <input
                          aria-label="Puntos que otorga"
                          className="pb-input w-24"
                          inputMode="numeric"
                          onChange={(e) => setDraft({ ...draft, puntos: e.target.value })}
                          value={draft.puntos}
                        />
                      ) : (
                        row.puntos
                      )}
                    </td>
                    <td className="p-2">
                      {row.estado ? 'ACTIVO' : 'INACTIVO'}
                      {!row.estado && row.se_elimina_en && <span className="block text-xs text-amber-400">{deletionNotice(row.se_elimina_en)}</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {editing ? (
                          <>
                            <button className={`${smallButton} border-emerald-500/40 text-emerald-400`} disabled={saving} onClick={() => void saveDraft()} type="button">
                              {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button className={smallButton} disabled={saving} onClick={() => setDraft(null)} type="button">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {canEdit && (
                              <button className={smallButton} onClick={() => setDraft({ id: row.id, nombre: row.nombre, puntos: String(row.puntos) })} type="button">
                                Editar
                              </button>
                            )}
                            <button className={smallButton} onClick={() => void toggleStatus(row)} type="button">
                              {row.estado ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="p-2 text-white/40" colSpan={canEdit ? 5 : 4}>Sin productos todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
