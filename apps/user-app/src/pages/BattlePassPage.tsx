import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'

type TierStatus = 'BLOQUEADO' | 'DESBLOQUEADO' | 'RECLAMADO'

type BattlePassTier = {
  id: number
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  recompensa_nombre: string
  recompensa_descripcion: string | null
  estado_usuario: TierStatus
  fecha_reclamo: string | null
}

type BattlePassProgress = {
  puntos_actuales: number
  tiers_desbloqueados: number
  tiers_totales: number
  progreso_porcentaje: number
  siguiente_hito_puntos: number | null
  siguiente_hito_faltante: number
  tiers: BattlePassTier[]
}

const statusClass: Record<TierStatus, string> = {
  BLOQUEADO: 'bg-slate-100 text-slate-600',
  DESBLOQUEADO: 'bg-amber-100 text-amber-800',
  RECLAMADO: 'bg-emerald-100 text-emerald-700',
}

export function BattlePassPage() {
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [claimingTierId, setClaimingTierId] = useState<number | null>(null)

  const loadProgress = async () => {
    setLoading(true)
    try {
      const response = await apiGet<BattlePassProgress>('/battle-pass/progress')
      setProgress(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el pase de batalla')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProgress()
  }, [])

  const nextMilestoneText = useMemo(() => {
    if (progress === null) {
      return ''
    }

    if (progress.siguiente_hito_puntos === null) {
      return 'Completaste todos los tiers actuales.'
    }

    return `Te faltan ${progress.siguiente_hito_faltante} puntos para el siguiente tier (${progress.siguiente_hito_puntos}).`
  }, [progress])

  async function claimTier(tierId: number) {
    setError('')
    setMessage('')
    setClaimingTierId(tierId)

    try {
      const response = await apiPost('/battle-pass/tiers/' + tierId + '/claim', {})
      setMessage(response.message)
      await loadProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible reclamar el tier')
    } finally {
      setClaimingTierId(null)
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">Cargando pase de batalla...</div>
  }

  if (progress === null) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-red-600">No se pudo obtener el progreso.</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Pase de Batalla</h1>
        <p className="mt-2 text-slate-600">Puntos actuales: <span className="font-semibold text-slate-900">{progress.puntos_actuales}</span></p>
        <p className="text-slate-600">Tiers desbloqueados: <span className="font-semibold text-slate-900">{progress.tiers_desbloqueados}/{progress.tiers_totales}</span></p>
        <p className="mt-2 text-sm text-slate-600">{nextMilestoneText}</p>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress.progreso_porcentaje}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Progreso: {progress.progreso_porcentaje}%</p>

        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Tiers</h2>
        <div className="space-y-3">
          {progress.tiers.map((tier) => (
            <div className="rounded-lg border border-slate-200 p-4" key={tier.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{tier.nombre}</h3>
                  <p className="text-sm text-slate-600">{tier.descripcion ?? 'Sin descripcion'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[tier.estado_usuario]}`}>{tier.estado_usuario}</span>
              </div>

              <div className="mt-3 text-sm text-slate-700">
                <p>Puntos requeridos: <span className="font-semibold text-slate-900">{tier.puntos_requeridos}</span></p>
                <p>Recompensa: <span className="font-semibold text-slate-900">{tier.recompensa_nombre}</span></p>
                {tier.recompensa_descripcion && <p>{tier.recompensa_descripcion}</p>}
              </div>

              {tier.estado_usuario === 'DESBLOQUEADO' && (
                <button
                  className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                  onClick={() => {
                    void claimTier(tier.id)
                  }}
                  type="button"
                >
                  {claimingTierId === tier.id ? 'Reclamando...' : 'Reclamar recompensa'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
