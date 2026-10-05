import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSession } from '../lib/auth'
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

const statusLabel: Record<TierStatus, string> = {
  BLOQUEADO: 'Bloqueado',
  DESBLOQUEADO: 'Desbloqueado',
  RECLAMADO: 'Reclamado',
}

const statusClass: Record<TierStatus, string> = {
  BLOQUEADO: 'border-slate-200 bg-slate-50',
  DESBLOQUEADO: 'border-emerald-200 bg-emerald-50',
  RECLAMADO: 'border-blue-200 bg-blue-50',
}

export function BattlePassPage() {
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [claimingTierId, setClaimingTierId] = useState<number | null>(null)

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiGet<BattlePassProgress>('/battle-pass/progress')
      setProgress(response.data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el pase de batalla.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProgress()
  }, [fetchProgress])

  const canClaim = useMemo(() => {
    return (tier: BattlePassTier) => tier.estado_usuario === 'DESBLOQUEADO' && claimingTierId === null
  }, [claimingTierId])

  const handleClaim = async (tierId: number) => {
    setClaimingTierId(tierId)
    setFeedback(null)
    setError(null)

    try {
      await apiPost(`/battle-pass/tiers/${tierId}/claim`, {})
      setFeedback('Recompensa reclamada correctamente.')
      await fetchProgress()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo reclamar el tier.')
    } finally {
      setClaimingTierId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pase de Batalla</h1>
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

      {loading && <p className="text-sm text-slate-600">Cargando progreso...</p>}

      {!loading && error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && feedback && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{feedback}</p>}

      {!loading && progress && (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Puntos actuales</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{progress.puntos_actuales}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tiers desbloqueados</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {progress.tiers_desbloqueados}/{progress.tiers_totales}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Siguiente hito</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {progress.siguiente_hito_puntos !== null
                  ? `${progress.siguiente_hito_puntos} puntos (faltan ${progress.siguiente_hito_faltante})`
                  : 'Completaste todos los tiers'}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Progreso total del pase</span>
              <span>{progress.progreso_porcentaje}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-slate-900" style={{ width: `${progress.progreso_porcentaje}%` }} />
            </div>
          </section>

          <section className="space-y-3">
            {progress.tiers.map((tier) => (
              <article className={`rounded-lg border p-4 ${statusClass[tier.estado_usuario]}`} key={tier.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{tier.nombre}</h2>
                    <p className="text-sm text-slate-600">{tier.descripcion ?? 'Sin descripcion adicional.'}</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Requiere <strong>{tier.puntos_requeridos}</strong> puntos
                    </p>
                    <p className="text-sm text-slate-700">
                      Recompensa: <strong>{tier.recompensa_nombre}</strong>
                    </p>
                    {tier.recompensa_descripcion && (
                      <p className="text-sm text-slate-600">{tier.recompensa_descripcion}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabel[tier.estado_usuario]}
                    </span>

                    {tier.estado_usuario !== 'RECLAMADO' && (
                      <button
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canClaim(tier)}
                        onClick={() => void handleClaim(tier.id)}
                        type="button"
                      >
                        {claimingTierId === tier.id ? 'Reclamando...' : 'Reclamar'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
