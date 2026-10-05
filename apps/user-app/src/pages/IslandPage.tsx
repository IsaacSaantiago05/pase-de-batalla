import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSession } from '../lib/auth'
import { apiGet, apiPost } from '../lib/api'

type IslandElementStatus = 'BLOQUEADO' | 'DISPONIBLE' | 'DESBLOQUEADO'

type IslandCatalogItem = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  recurso: string | null
  nivel_requerido: number
  estado_usuario: IslandElementStatus
}

type IslandLayoutItem = {
  id: number
  elemento_id: number
  posicion_x: number
  posicion_y: number
  posicion_z: number | null
}

type CatalogResponse = {
  elementos: IslandCatalogItem[]
}

type LayoutResponse = {
  items: IslandLayoutItem[]
}

type PositionForm = {
  x: string
  y: string
  z: string
}

const statusLabel: Record<IslandElementStatus, string> = {
  BLOQUEADO: 'Bloqueado',
  DISPONIBLE: 'Disponible',
  DESBLOQUEADO: 'Desbloqueado',
}

const statusClass: Record<IslandElementStatus, string> = {
  BLOQUEADO: 'border-slate-200 bg-slate-50',
  DISPONIBLE: 'border-amber-200 bg-amber-50',
  DESBLOQUEADO: 'border-emerald-200 bg-emerald-50',
}

export function IslandPage() {
  const [catalog, setCatalog] = useState<IslandCatalogItem[]>([])
  const [layout, setLayout] = useState<Record<number, IslandLayoutItem>>({})
  const [positionForms, setPositionForms] = useState<Record<number, PositionForm>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const hydratePositionForms = useCallback((items: IslandCatalogItem[], layoutMap: Record<number, IslandLayoutItem>) => {
    const nextForms: Record<number, PositionForm> = {}

    for (const item of items) {
      const placed = layoutMap[item.id]
      nextForms[item.id] = {
        x: placed ? String(placed.posicion_x) : '0',
        y: placed ? String(placed.posicion_y) : '0',
        z: placed?.posicion_z !== null && placed?.posicion_z !== undefined ? String(placed.posicion_z) : '',
      }
    }

    setPositionForms(nextForms)
  }, [])

  const fetchIslandData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [catalogResponse, layoutResponse] = await Promise.all([
        apiGet<CatalogResponse>('/island/catalog'),
        apiGet<LayoutResponse>('/island/layout'),
      ])

      const nextCatalog = catalogResponse.data.elementos
      const layoutMap = Object.fromEntries(layoutResponse.data.items.map((item) => [item.elemento_id, item]))

      setCatalog(nextCatalog)
      setLayout(layoutMap)
      hydratePositionForms(nextCatalog, layoutMap)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la isla.')
    } finally {
      setLoading(false)
    }
  }, [hydratePositionForms])

  useEffect(() => {
    void fetchIslandData()
  }, [fetchIslandData])

  const unlockedCount = useMemo(() => catalog.filter((item) => item.estado_usuario === 'DESBLOQUEADO').length, [catalog])

  const handleUnlock = async (elementId: number) => {
    setUnlockingId(elementId)
    setError(null)
    setFeedback(null)

    try {
      await apiPost('/island/unlock', { elemento_id: elementId })
      setFeedback('Elemento desbloqueado correctamente.')
      await fetchIslandData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo desbloquear el elemento.')
    } finally {
      setUnlockingId(null)
    }
  }

  const handlePositionChange = (elementId: number, field: keyof PositionForm, value: string) => {
    setPositionForms((current) => ({
      ...current,
      [elementId]: {
        ...(current[elementId] ?? { x: '0', y: '0', z: '' }),
        [field]: value,
      },
    }))
  }

  const handleSavePosition = async (elementId: number) => {
    const form = positionForms[elementId] ?? { x: '0', y: '0', z: '' }
    const x = Number(form.x)
    const y = Number(form.y)
    const z = form.z.trim() === '' ? null : Number(form.z)

    if (Number.isNaN(x) || Number.isNaN(y) || (z !== null && Number.isNaN(z))) {
      setError('Las posiciones deben ser numericas.')
      return
    }

    setSavingId(elementId)
    setError(null)
    setFeedback(null)

    try {
      await apiPost('/island/layout', {
        elemento_id: elementId,
        posicion_x: x,
        posicion_y: y,
        posicion_z: z,
      })

      setFeedback('Posicion guardada correctamente.')
      await fetchIslandData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar la posicion.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Mi Isla</h1>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => {
            clearSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          '/home',
          '/island',
          '/battle-pass',
          '/points',
          '/scan-qr',
          '/rewards',
          '/redemptions',
          '/history',
          '/businesses',
          '/profile',
        ].map((route) => (
          <Link className="rounded-md border px-2 py-1" key={route} to={route}>
            {route}
          </Link>
        ))}
      </nav>

      {loading && <p className="text-sm text-slate-600">Cargando isla...</p>}
      {!loading && error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && feedback && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{feedback}</p>}

      {!loading && (
        <>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              Elementos desbloqueados: <strong>{unlockedCount}</strong> de <strong>{catalog.length}</strong>
            </p>
          </section>

          <section className="space-y-3">
            {catalog.map((item) => {
              const form = positionForms[item.id] ?? { x: '0', y: '0', z: '' }
              const placed = layout[item.id]

              return (
                <article className={`rounded-lg border p-4 ${statusClass[item.estado_usuario]}`} key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{item.nombre}</h2>
                      <p className="text-sm text-slate-600">{item.descripcion ?? 'Sin descripcion adicional.'}</p>
                      <p className="text-sm text-slate-700">Categoria: {item.categoria}</p>
                      <p className="text-sm text-slate-700">Nivel requerido: {item.nivel_requerido}</p>
                    </div>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabel[item.estado_usuario]}
                    </span>
                  </div>

                  {item.estado_usuario === 'DISPONIBLE' && (
                    <button
                      className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={unlockingId !== null}
                      onClick={() => void handleUnlock(item.id)}
                      type="button"
                    >
                      {unlockingId === item.id ? 'Desbloqueando...' : 'Desbloquear'}
                    </button>
                  )}

                  {item.estado_usuario === 'DESBLOQUEADO' && (
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <label className="text-sm text-slate-700">
                        X
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'x', event.target.value)}
                          type="number"
                          value={form.x}
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Y
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'y', event.target.value)}
                          type="number"
                          value={form.y}
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Z
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'z', event.target.value)}
                          placeholder="Opcional"
                          type="number"
                          value={form.z}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={savingId !== null}
                          onClick={() => void handleSavePosition(item.id)}
                          type="button"
                        >
                          {savingId === item.id ? 'Guardando...' : 'Guardar posicion'}
                        </button>
                      </div>

                      <p className="md:col-span-4 text-xs text-slate-500">
                        {placed
                          ? `Posicion actual: X ${placed.posicion_x}, Y ${placed.posicion_y}${placed.posicion_z !== null ? `, Z ${placed.posicion_z}` : ''}`
                          : 'Aun no tiene posicion guardada.'}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
