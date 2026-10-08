import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'

type Reward = {
  id: number
  negocio_id: number
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  cantidad_disponible: number
  estado: boolean
}

type RewardListPayload = {
  data: Reward[]
}

type Redemption = {
  id: number
  recompensa_nombre: string | null
  puntos_utilizados: number
  estado: string
  fecha: string
}

type RedemptionListPayload = {
  data: Redemption[]
}

type CreateRedemptionPayload = {
  canje: Redemption
  saldo_global: number
  nivel_id: number | null
}

export function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadRewards = async () => {
    try {
      const response = await apiGet<RewardListPayload>('/rewards')
      setRewards(response.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar recompensas')
    }
  }

  useEffect(() => {
    void loadRewards()
  }, [])

  async function redeem(rewardId: number) {
    setMessage('')
    setError('')

    try {
      const response = await apiPost<CreateRedemptionPayload>('/redemptions', {
        recompensa_id: rewardId,
      })
      setMessage(`Canje creado. Saldo actual: ${response.data.saldo_global}`)
      await loadRewards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible realizar el canje')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Recompensas disponibles</h1>
        <p className="mb-4 text-sm text-slate-600">El stock y los puntos se descuentan al crear el canje.</p>
        {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {rewards.map((reward) => (
            <div className="rounded-lg border border-slate-200 p-4" key={reward.id}>
              <p className="text-sm text-slate-500">Negocio #{reward.negocio_id}</p>
              <h2 className="text-lg font-semibold text-slate-900">{reward.nombre}</h2>
              <p className="mt-1 text-sm text-slate-600">{reward.descripcion ?? 'Sin descripcion'}</p>
              <p className="mt-3 text-sm text-slate-700">Puntos requeridos: <span className="font-semibold">{reward.puntos_requeridos}</span></p>
              <p className="text-sm text-slate-700">Stock: <span className="font-semibold">{reward.cantidad_disponible}</span></p>
              <button
                className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                onClick={() => {
                  void redeem(reward.id)
                }}
                type="button"
              >
                Canjear
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RedemptionsPage() {
  const [rows, setRows] = useState<Redemption[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiGet<RedemptionListPayload>('/redemptions/my')
        setRows(response.data.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No fue posible cargar tus canjes')
      }
    }

    void load()
  }, [])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Mis canjes</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Recompensa</th>
              <th className="p-2">Puntos</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b" key={row.id}>
                <td className="p-2">{row.recompensa_nombre ?? '-'}</td>
                <td className="p-2">{row.puntos_utilizados}</td>
                <td className="p-2">{row.estado}</td>
                <td className="p-2">{row.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
