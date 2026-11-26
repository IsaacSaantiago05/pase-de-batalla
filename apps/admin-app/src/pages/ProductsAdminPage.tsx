import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@shared/api'
import { ChipButton, Icon, InputField, StatusChip, formatPoints } from '@shared/ui'
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

// Errores de la edicion: se muestran dentro de la tarjeta que se esta editando, no arriba de la pantalla.
type DraftErrors = { nombre?: string; puntos?: string; general?: string }

const MAX_POINTS = 100000

const DAY_MS = 24 * 60 * 60 * 1000

function deletionNotice(date: string) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS)

  return days <= 1 ? 'Se elimina en menos de 1 día' : `Se elimina en ${days} días`
}

// El negocio crea, edita y activa o desactiva sus productos; el administrador general puede editar los de cualquier negocio.
export function ProductsAdminPage() {
  const role = getAdminSession()?.role
  const canCreate = role === 'ADMINISTRADOR_NEGOCIO'
  // El administrador general ve los productos de todos los negocios, con el nombre del negocio en cada uno.
  const isGeneral = role === 'ADMINISTRADOR_GENERAL'
  const [rows, setRows] = useState<Product[]>([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({})
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

  function startEditing(row: Product) {
    setMessage('')
    setError('')
    setDraftErrors({})
    setDraft({ id: row.id, nombre: row.nombre, puntos: String(row.puntos) })
  }

  async function saveDraft() {
    if (!draft) return
    setMessage('')
    setError('')

    const errors: DraftErrors = {}
    const pointsText = draft.puntos.trim()
    if (draft.nombre.trim() === '') errors.nombre = 'El nombre del producto es obligatorio.'
    if (!/^\d+$/.test(pointsText) || Number(pointsText) < 1 || Number(pointsText) > MAX_POINTS) {
      errors.puntos = `Escribe un número entero entre 1 y ${MAX_POINTS.toLocaleString('es-MX')}.`
    }
    setDraftErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)

    try {
      await apiPut(`/products/${draft.id}`, { nombre: draft.nombre.trim(), puntos: Number(pointsText) })
      setMessage('Producto actualizado correctamente.')
      setDraft(null)
      await loadProducts()
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {}

      if (fields.nombre || fields.puntos) setDraftErrors({ nombre: fields.nombre, puntos: fields.puntos })
      else setDraftErrors({ general: err instanceof Error ? err.message : 'No fue posible actualizar el producto' })
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
              Cada producto activo aparece como botón en Códigos QR. Con "Editar" puedes cambiar su nombre y sus puntos; los QR que ya generaste conservan los puntos que tenían. Un producto inactivo se elimina solo a los 7 días.
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

      <div>
        <h2 className="mb-3 text-xl font-semibold font-display tracking-wider text-white">Listado ({rows.length})</h2>

        {/* Tarjetas en lugar de tabla: en un telefono los botones quedan debajo de cada producto, siempre a la vista. */}
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const editing = draft?.id === row.id

            return (
              <div className="pb-card min-w-0 rounded-2xl p-4" key={row.id} style={{ opacity: row.estado || editing ? 1 : 0.7 }}>
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <InputField
                      error={draftErrors.nombre}
                      id={`product-name-${row.id}`}
                      label="Nombre"
                      maxLength={150}
                      onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                      value={draft.nombre}
                    />
                    <InputField
                      error={draftErrors.puntos}
                      id={`product-points-${row.id}`}
                      inputMode="numeric"
                      label="Puntos que otorga"
                      onChange={(e) => setDraft({ ...draft, puntos: e.target.value })}
                      value={draft.puntos}
                    />
                    {draftErrors.general && (
                      <p className="text-xs font-semibold text-red-400" role="alert">
                        {draftErrors.general}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <ChipButton disabled={saving} onClick={() => void saveDraft()} tone="green">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </ChipButton>
                      <ChipButton disabled={saving} onClick={() => setDraft(null)}>
                        Cancelar
                      </ChipButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-display text-base font-bold text-white">{row.nombre}</p>
                      <StatusChip status={row.estado ? 'ACTIVO' : 'INACTIVO'} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                      <span className="font-mono-game text-yellow-400">
                        <Icon className="mr-1" name="pointsSolid" />
                        {formatPoints(row.puntos)} pts
                      </span>
                      {isGeneral && (
                        <>
                          <span>·</span>
                          <span>{row.negocio_nombre ?? `Negocio #${row.negocio_id}`}</span>
                        </>
                      )}
                    </div>
                    {!row.estado && row.se_elimina_en && <p className="mt-1 text-xs text-amber-400">{deletionNotice(row.se_elimina_en)}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ChipButton onClick={() => startEditing(row)} tone="gold">
                        Editar
                      </ChipButton>
                      <ChipButton onClick={() => void toggleStatus(row)} tone={row.estado ? 'red' : 'green'}>
                        {row.estado ? 'Desactivar' : 'Activar'}
                      </ChipButton>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {rows.length === 0 && <p className="pb-card rounded-2xl p-4 text-sm text-white/40">Sin productos todavía.</p>}
      </div>
    </div>
  )
}
