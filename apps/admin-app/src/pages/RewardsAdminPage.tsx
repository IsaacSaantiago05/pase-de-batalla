import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError } from '@shared/api'
import { IMAGE_ACCEPT, REWARD_PRESET, prepareImage } from '@shared/image'
import { Button, ChipButton, EmptyState, FieldLabel, Icon, InputField, Notice, SectionTitle, StatusChip, formatPoints } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Reward = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  nombre: string
  descripcion: string | null
  foto_url: string | null
  puntos_requeridos: number
  cantidad_disponible: number
  estado: boolean
}

type RewardListPayload = {
  data: Reward[]
}

const MAX_STOCK = 100000

// Foto del articulo en miniatura con su boton de camara, que es el unico control para agregarla o cambiarla.
function PhotoPicker({ photoUrl, label, disabled, onPick }: { photoUrl: string | null; label: string; disabled: boolean; onPick: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null)

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Se limpia para poder elegir otra vez el mismo archivo.
    event.target.value = ''
    if (file) onPick(file)
  }

  return (
    <div className="relative shrink-0">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-3xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {photoUrl ? <img alt="" className="h-full w-full object-cover" src={photoUrl} /> : <Icon name="reward" />}
      </div>
      <button
        aria-label={label}
        className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => input.current?.click()}
        style={{ background: '#f59e0b', border: '2px solid #111827', color: '#0d0a00' }}
        title={label}
        type="button"
      >
        <Icon color="currentColor" name="camera" />
      </button>
      <input accept={IMAGE_ACCEPT} className="hidden" onChange={onChange} ref={input} type="file" />
    </div>
  )
}

export function RewardsAdminPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [rows, setRows] = useState<Reward[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState('')
  const [stock, setStock] = useState('')
  const [negocioId, setNegocioId] = useState('')
  // Foto elegida para la recompensa nueva: ya reducida, se sube en cuanto la recompensa existe.
  const [newPhoto, setNewPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [saving, setSaving] = useState(false)
  // Recompensa cuya foto se esta subiendo o quitando.
  const [busyPhotoId, setBusyPhotoId] = useState<number | null>(null)
  // Edicion de la cantidad disponible: en que recompensa y con que valor.
  const [stockEdit, setStockEdit] = useState<{ id: number; value: string } | null>(null)
  const [stockError, setStockError] = useState('')
  const [savingStock, setSavingStock] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadRewards = async () => {
    try {
      const response = await apiGet<RewardListPayload>('/rewards')
      setRows(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar recompensas')
    }
  }

  useEffect(() => {
    void loadRewards()
  }, [])

  // La vista previa de la foto nueva ocupa memoria del navegador: se libera al cambiarla o salir.
  useEffect(() => {
    return () => {
      if (newPhoto) URL.revokeObjectURL(newPhoto.preview)
    }
  }, [newPhoto])

  // Tras guardar, la API devuelve la recompensa actualizada: se cambia solo esa tarjeta.
  const replaceRow = (saved: Reward) => setRows((current) => current.map((row) => (row.id === saved.id ? saved : row)))

  const imageError = (err: unknown, fallback: string) => (err instanceof ApiError && err.fields.imagen ? err.fields.imagen : err instanceof Error ? err.message : fallback)

  async function pickNewPhoto(file: File) {
    setError('')

    try {
      const prepared = await prepareImage(file, REWARD_PRESET)
      setNewPhoto({ file: prepared, preview: URL.createObjectURL(prepared) })
    } catch (err) {
      setError(imageError(err, 'No fue posible leer la foto'))
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        nombre,
        descripcion: descripcion.trim() || null,
        puntos_requeridos: Number(puntos),
        cantidad_disponible: Number(stock),
      }

      if (negocioId.trim()) {
        payload.negocio_id = Number(negocioId)
      }

      const created = await apiPost<Reward>('/rewards', payload)
      let photoProblem = ''

      if (newPhoto) {
        try {
          const form = new FormData()
          form.append('imagen', newPhoto.file)
          await apiUpload<Reward>(`/rewards/${created.data.id}/photo`, form)
        } catch (err) {
          photoProblem = imageError(err, 'error al subirla')
        }
      }

      if (photoProblem) setError(`La recompensa se creó, pero la foto no se pudo subir: ${photoProblem} Puedes agregarla desde su tarjeta.`)
      else setMessage('Recompensa creada correctamente.')

      setNombre('')
      setDescripcion('')
      setPuntos('')
      setStock('')
      setNegocioId('')
      setNewPhoto(null)
      setShowForm(false)
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la recompensa')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(row: Reward) {
    setMessage('')
    setError('')

    try {
      await apiPatch(`/rewards/${row.id}/status`, {
        estado: !row.estado,
      })
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar estado')
    }
  }

  async function changePhoto(row: Reward, file: File) {
    setMessage('')
    setError('')
    setBusyPhotoId(row.id)

    try {
      const form = new FormData()
      form.append('imagen', await prepareImage(file, REWARD_PRESET))
      const response = await apiUpload<Reward>(`/rewards/${row.id}/photo`, form)
      replaceRow(response.data)
    } catch (err) {
      setError(imageError(err, 'No fue posible subir la foto'))
    } finally {
      setBusyPhotoId(null)
    }
  }

  async function removePhoto(row: Reward) {
    setMessage('')
    setError('')
    setBusyPhotoId(row.id)

    try {
      const response = await apiDelete<Reward>(`/rewards/${row.id}/photo`)
      replaceRow(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible quitar la foto')
    } finally {
      setBusyPhotoId(null)
    }
  }

  async function saveStock(row: Reward) {
    if (!stockEdit) return
    setStockError('')

    const text = stockEdit.value.trim()
    if (!/^\d+$/.test(text) || Number(text) > MAX_STOCK) {
      setStockError(`Escribe un número entero entre 0 y ${MAX_STOCK.toLocaleString('es-MX')}.`)
      return
    }

    setSavingStock(true)

    try {
      const response = await apiPut<Reward>(`/rewards/${row.id}`, { cantidad_disponible: Number(text) })
      replaceRow(response.data)
      setStockEdit(null)
    } catch (err) {
      if (err instanceof ApiError && err.fields.cantidad_disponible) setStockError(err.fields.cantidad_disponible)
      else setStockError(err instanceof Error ? err.message : 'No fue posible guardar la cantidad')
    } finally {
      setSavingStock(false)
    }
  }

  // Activas pero sin existencias: los clientes no las ven hasta que se repongan.
  const soldOut = rows.filter((row) => row.estado && row.cantidad_disponible <= 0).length

  return (
    <AdminPage title="RECOMPENSAS">
      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-display text-sm font-bold tracking-widest transition-all active:scale-95"
        onClick={() => setShowForm((current) => !current)}
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
        type="button"
      >
        <span>{showForm ? '−' : '+'}</span> NUEVA RECOMPENSA
      </button>

      {showForm && (
        <form className="flex flex-col gap-3 rounded-2xl p-5" onSubmit={onSubmit} style={{ background: 'linear-gradient(135deg, #1a2235, #111827)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-green-400">Nueva Recompensa</p>
          <div className="flex items-center gap-4">
            <PhotoPicker disabled={saving} label={newPhoto ? 'Cambiar foto del artículo' : 'Agregar foto del artículo'} onPick={(file) => void pickNewPhoto(file)} photoUrl={newPhoto?.preview ?? null} />
            <div className="min-w-0">
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-white/50">Foto del artículo</p>
              <p className="text-xs text-white/40">Opcional. Usa el botón de cámara; acepta JPG, PNG o WebP.</p>
              {newPhoto && (
                <ChipButton className="mt-1.5" disabled={saving} onClick={() => setNewPhoto(null)} tone="red">
                  Quitar foto
                </ChipButton>
              )}
            </div>
          </div>
          <InputField label="Nombre" onChange={(e) => setNombre(e.target.value)} placeholder="ej. Bebida gratis" value={nombre} />
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="reward-description">Descripción</FieldLabel>
            <textarea className="pb-input" id="reward-description" onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción breve..." rows={2} value={descripcion} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField inputMode="numeric" label="Puntos requeridos" onChange={(e) => setPuntos(e.target.value)} placeholder="ej. 300" value={puntos} />
            <InputField inputMode="numeric" label="Cantidad disponible" onChange={(e) => setStock(e.target.value)} placeholder="ej. 20" value={stock} />
          </div>
          {isGeneral && <InputField inputMode="numeric" label="ID del negocio" onChange={(e) => setNegocioId(e.target.value)} placeholder="Solo administrador general" value={negocioId} />}
          <Button className="w-full tracking-widest" disabled={saving} type="submit" variant="green">
            {saving ? 'GUARDANDO...' : 'GUARDAR'}
          </Button>
        </form>
      )}

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {soldOut > 0 && (
        <Notice tone="info">
          {soldOut === 1 ? 'Hay 1 recompensa agotada: los clientes no la ven' : `Hay ${soldOut} recompensas agotadas: los clientes no las ven`} hasta que repongas existencias con "Editar cantidad".
        </Notice>
      )}

      <SectionTitle className="text-white/40">Recompensas ({rows.length})</SectionTitle>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const status = !row.estado ? 'INACTIVA' : row.cantidad_disponible > 0 ? 'ACTIVA' : 'AGOTADA'
          const busyPhoto = busyPhotoId === row.id
          const editingStock = stockEdit?.id === row.id

          return (
            <div className="pb-card rounded-2xl p-4" key={row.id} style={{ opacity: row.estado ? 1 : 0.6 }}>
              <div className="flex items-start gap-4">
                <PhotoPicker
                  disabled={busyPhoto}
                  label={row.foto_url ? 'Cambiar foto del artículo' : 'Agregar foto del artículo'}
                  onPick={(file) => void changePhoto(row, file)}
                  photoUrl={row.foto_url}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate font-display text-base font-bold text-white">{row.nombre}</p>
                    <StatusChip status={status} />
                  </div>
                  {row.descripcion && <p className="mb-2 text-xs text-white/50">{row.descripcion}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                    <span className="font-mono-game text-yellow-400"><Icon className="mr-1" name="pointsSolid" />
                      {formatPoints(row.puntos_requeridos)} pts</span>
                    <span>·</span>
                    <span className={row.cantidad_disponible > 0 ? '' : 'font-semibold text-red-400'}>{row.cantidad_disponible} disponibles</span>
                    {isGeneral && (
                      <>
                        <span>·</span>
                        <span>{row.negocio_nombre ?? `Negocio #${row.negocio_id}`}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {editingStock ? (
                <div className="mt-3 flex flex-col gap-2">
                  <InputField
                    error={stockError || undefined}
                    id={`reward-stock-${row.id}`}
                    inputMode="numeric"
                    label="Cantidad disponible"
                    onChange={(e) => setStockEdit({ id: row.id, value: e.target.value })}
                    value={stockEdit.value}
                  />
                  <div className="flex flex-wrap gap-2">
                    <ChipButton disabled={savingStock} onClick={() => void saveStock(row)} tone="green">
                      {savingStock ? 'Guardando...' : 'Guardar cantidad'}
                    </ChipButton>
                    <ChipButton disabled={savingStock} onClick={() => setStockEdit(null)}>
                      Cancelar
                    </ChipButton>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChipButton
                    onClick={() => {
                      setStockError('')
                      setStockEdit({ id: row.id, value: String(row.cantidad_disponible) })
                    }}
                    tone="gold"
                  >
                    Editar cantidad
                  </ChipButton>
                  {busyPhoto ? (
                    <span className="self-center text-xs font-semibold text-white/50" role="status">
                      Guardando foto...
                    </span>
                  ) : (
                    row.foto_url && (
                      // Tono neutro: en la misma fila el rojo queda para "Desactivar".
                      <ChipButton onClick={() => void removePhoto(row)}>Quitar foto</ChipButton>
                    )
                  )}
                  <ChipButton className="ml-auto" onClick={() => void toggleStatus(row)} tone={row.estado ? 'red' : 'green'}>
                    {row.estado ? 'Desactivar' : 'Activar'}
                  </ChipButton>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {rows.length === 0 && !error && <EmptyState icon="reward" text="Crea la primera con el botón de arriba." title="Sin recompensas" />}
    </AdminPage>
  )
}
