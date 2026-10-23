import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'

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

type BalancePayload = {
  saldo_global: number
}

type CreateRedemptionPayload = {
  saldo_global: number
}

export function RewardDetailPage() {
  const { id } = useParams()
  const [reward, setReward] = useState<Reward | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiGet<Reward>(`/rewards/${id}`), apiGet<BalancePayload>('/points/balance')])
      .then(([rewardResponse, balanceResponse]) => {
        setReward(rewardResponse.data)
        setBalance(balanceResponse.data.saldo_global)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar la recompensa'))
  }, [id])

  async function redeem() {
    if (!reward) return
    setError('')
    setSaving(true)

    try {
      const response = await apiPost<CreateRedemptionPayload>('/redemptions', { recompensa_id: reward.id })
      setBalance(response.data.saldo_global)
      setReward({ ...reward, cantidad_disponible: reward.cantidad_disponible - 1 })
      setMessage('Canje creado. Muestra la seccion "Canjes" en el negocio para recibir tu recompensa.')
      setConfirming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible realizar el canje')
    } finally {
      setSaving(false)
    }
  }

  const missing = reward && balance !== null ? Math.max(0, reward.puntos_requeridos - balance) : 0
  const outOfStock = reward ? reward.cantidad_disponible <= 0 : false

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link className="inline-block rounded-md border bg-white px-3 py-1 text-sm" to="/rewards">
        Volver a recompensas
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!reward && !error && <p className="text-sm text-slate-500">Cargando...</p>}

        {reward && (
          <>
            <p className="text-sm text-slate-500">{reward.negocio_nombre ?? `Negocio #${reward.negocio_id}`}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{reward.nombre}</h1>
            <p className="mt-2 text-slate-600">{reward.descripcion ?? 'Sin descripcion'}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cuesta</p>
                <p className="text-xl font-semibold">{reward.puntos_requeridos} pts</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tu saldo</p>
                <p className="text-xl font-semibold">{balance ?? '-'} pts</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Disponibles</p>
                <p className="text-xl font-semibold">{reward.cantidad_disponible}</p>
              </div>
            </div>

            {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}

            <div className="mt-5">
              {outOfStock ? (
                <p className="text-sm font-medium text-slate-600">Agotada por ahora.</p>
              ) : missing > 0 ? (
                <p className="text-sm font-medium text-slate-600">Te faltan {missing} puntos para canjearla.</p>
              ) : confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">Se descontaran {reward.puntos_requeridos} puntos. ¿Confirmas?</span>
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={saving}
                    onClick={() => {
                      void redeem()
                    }}
                    type="button"
                  >
                    {saving ? 'Canjeando...' : 'Si, canjear'}
                  </button>
                  <button className="rounded-md border px-4 py-2 text-sm" onClick={() => setConfirming(false)} type="button">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => setConfirming(true)} type="button">
                  Canjear
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
