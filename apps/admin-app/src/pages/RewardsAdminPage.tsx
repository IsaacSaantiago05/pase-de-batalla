import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, ChipButton, EmptyState, FieldLabel, Icon, InputField, Notice, SectionTitle, StatusChip, formatPoints } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPatch, apiPost, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Reward = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  cantidad_disponible: number
  estado: boolean
}

type RewardListPayload = {
  data: Reward[]
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

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

      await apiPost('/rewards', payload)
      setMessage('Recompensa creada correctamente.')
      setNombre('')
      setDescripcion('')
      setPuntos('')
      setStock('')
      setNegocioId('')
      setShowForm(false)
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la recompensa')
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
          <Button className="w-full tracking-widest" type="submit" variant="green">
            GUARDAR
          </Button>
        </form>
      )}

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <SectionTitle className="text-white/40">Recompensas ({rows.length})</SectionTitle>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const status = !row.estado ? 'INACTIVA' : row.cantidad_disponible > 0 ? 'ACTIVA' : 'AGOTADA'

          return (
            <div className="pb-card rounded-2xl p-4" key={row.id} style={{ opacity: row.estado ? 1 : 0.6 }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="text-2xl" name="reward" />
                  <p className="truncate font-display text-base font-bold text-white">{row.nombre}</p>
                </div>
                <StatusChip status={status} />
              </div>
              {row.descripcion && <p className="mb-2 text-xs text-white/50">{row.descripcion}</p>}
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                <span className="font-mono-game text-yellow-400"><Icon className="mr-1" name="pointsSolid" />
                  {formatPoints(row.puntos_requeridos)} pts</span>
                <span>·</span>
                <span>{row.cantidad_disponible} disponibles</span>
                {isGeneral && (
                  <>
                    <span>·</span>
                    <span>{row.negocio_nombre ?? `Negocio #${row.negocio_id}`}</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <ChipButton className="flex-1" onClick={() => void toggleStatus(row)} tone={row.estado ? 'red' : 'green'}>
                  {row.estado ? 'Desactivar' : 'Activar'}
                </ChipButton>
              </div>
            </div>
          )
        })}
      </div>
      {rows.length === 0 && !error && <EmptyState icon="reward" text="Crea la primera con el botón de arriba." title="Sin recompensas" />}
    </AdminPage>
  )
}
