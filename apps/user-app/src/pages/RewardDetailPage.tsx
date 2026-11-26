import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, LoadingState, Notice, ScreenHeader, formatPoints } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, apiPost, listData } from '../lib/api'

type Reward = {
  id: number
  negocio_id: number
  negocio_nombre?: string | null
  nombre: string
  descripcion: string | null
  foto_url?: string | null
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

type Step = 'detail' | 'confirm' | 'done'

const divider = <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

export function RewardDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useGoBack('/rewards')
  const [reward, setReward] = useState<Reward | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('detail')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // La API no tiene detalle por id: la recompensa llega desde la lista; si se entra directo por URL se busca en ella.
    const fromList = (location.state as { reward?: Reward } | null)?.reward
    const rewardRequest: Promise<Reward | undefined> =
      fromList && String(fromList.id) === id
        ? Promise.resolve(fromList)
        : apiGet<{ data: Reward[] }>('/rewards').then((response) => listData(response.data).find((item) => String(item.id) === id))

    Promise.all([rewardRequest, apiGet<BalancePayload>('/points/balance')])
      .then(([found, balanceResponse]) => {
        setBalance(balanceResponse.data.saldo_global)
        if (found) setReward(found)
        else setError('La recompensa no existe o ya no está disponible.')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar la recompensa'))
  }, [id, location.state])

  async function redeem() {
    if (!reward) return
    setError('')
    setSaving(true)

    try {
      const response = await apiPost<CreateRedemptionPayload>('/redemptions', { recompensa_id: reward.id })
      setBalance(response.data.saldo_global)
      setReward({ ...reward, cantidad_disponible: reward.cantidad_disponible - 1 })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible realizar el canje')
      setStep('detail')
    } finally {
      setSaving(false)
    }
  }

  if (reward && step === 'done') {
    return (
      <Page background="linear-gradient(180deg, #021a0e 0%, #080c18 100%)" className="items-center justify-center gap-8 px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center anim-scale-in">
          <div className="flex h-28 w-28 items-center justify-center rounded-full text-5xl" style={{ background: '#10b98120', border: '3px solid #10b981', boxShadow: '0 0 48px rgba(16,185,129,0.4)' }}>
            <Icon color="#34d399" name="reward" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold tracking-wide text-green-400">¡Canjeado!</p>
            <p className="mt-1 text-lg font-semibold text-white">{reward.nombre}</p>
            <p className="mt-1 text-sm text-white/40">{reward.negocio_nombre ?? `Negocio #${reward.negocio_id}`}</p>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-2xl p-4" style={{ background: '#10b98110', border: '1px solid #10b98130' }}>
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Puntos descontados</span>
              <span className="font-mono-game font-bold text-red-400">-{formatPoints(reward.puntos_requeridos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-white/60">Nuevo total</span>
              <span className="font-mono-game font-bold text-yellow-400">{balance === null ? '-' : formatPoints(balance)}</span>
            </div>
          </div>
          <p className="text-xs text-white/40">Muestra tu canje en el negocio para recibir la recompensa.</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button className="w-full tracking-widest" onClick={() => navigate('/redemptions')}>
            VER MIS CANJES
          </Button>
          <button className="text-center text-sm font-semibold text-white/40" onClick={() => navigate('/rewards')} type="button">
            Seguir explorando
          </button>
        </div>
      </Page>
    )
  }

  if (reward && step === 'confirm') {
    return (
      <Page background="linear-gradient(180deg, #080c18 0%, #040d1e 100%)" className="items-center justify-center gap-6 px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center anim-scale-in">
          {reward.foto_url ? (
            <img alt="" className="h-28 w-28 rounded-3xl object-cover" src={reward.foto_url} style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <Icon className="text-7xl" name="reward" />
          )}
          <div>
            <p className="font-display text-2xl font-bold tracking-wide text-white">{reward.nombre}</p>
            <p className="mt-1 text-sm text-white/50">{reward.negocio_nombre ?? `Negocio #${reward.negocio_id}`}</p>
          </div>
          <div className="pb-card w-full rounded-2xl p-5">
            <p className="mb-1 font-display text-lg font-bold text-white">¿Deseas canjear esta recompensa?</p>
            <p className="text-sm text-white/50">
              Se descontarán <span className="font-mono-game font-bold text-yellow-400">{formatPoints(reward.puntos_requeridos)}</span> puntos.
            </p>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button className="w-full tracking-widest" disabled={saving} onClick={() => void redeem()}>
            {saving ? 'CANJEANDO...' : 'CONFIRMAR CANJE'}
          </Button>
          <Button className="w-full" disabled={saving} onClick={() => setStep('detail')} variant="ghost">
            CANCELAR
          </Button>
        </div>
      </Page>
    )
  }

  const missing = reward && balance !== null ? Math.max(0, reward.puntos_requeridos - balance) : 0
  const outOfStock = reward ? reward.cantidad_disponible <= 0 : false

  return (
    <Page>
      <ScreenHeader onBack={goBack} title={reward?.nombre ?? 'RECOMPENSA'} />

      <div className="flex flex-1 flex-col gap-5 px-5 pb-8">
        {error && <Notice tone="error">{error}</Notice>}
        {!reward && !error && <LoadingState />}

        {reward && (
          <>
            {reward.foto_url ? (
              // Foto del articulo, a lo ancho.
              <div className="overflow-hidden rounded-3xl" style={{ background: '#0d1424', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img alt={`Foto de ${reward.nombre}`} className="max-h-80 w-full object-cover" src={reward.foto_url} style={{ aspectRatio: '4 / 3' }} />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-3xl" style={{ height: 180, background: 'linear-gradient(135deg, #1a2235, #0d1424)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Icon className="text-8xl" name="reward" style={{ filter: 'drop-shadow(0 0 24px rgba(168,85,247,0.35))' }} />
              </div>
            )}

            <div>
              <h2 className="font-display text-2xl font-bold text-white">{reward.nombre}</h2>
              <p className="mt-0.5 text-sm font-semibold text-yellow-400"><Icon className="mr-1" color="currentColor" name="business" />
                {reward.negocio_nombre ?? `Negocio #${reward.negocio_id}`}</p>
            </div>

            <div className="pb-card flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Puntos necesarios</span>
                <span className="font-mono-game font-bold text-yellow-400"><Icon className="mr-1" name="pointsSolid" />
                  {formatPoints(reward.puntos_requeridos)}
                </span>
              </div>
              {divider}
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Disponibles</span>
                <span className="font-mono-game font-bold text-white">{reward.cantidad_disponible}</span>
              </div>
              {divider}
              <div className="flex justify-between">
                <span className="text-sm text-white/60">Tus puntos</span>
                <span className="font-mono-game font-bold text-emerald-400">{balance === null ? '-' : formatPoints(balance)}</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/60">{reward.descripcion ?? 'Sin descripción.'}</p>

            <div className="mt-auto">
              {outOfStock ? (
                <div className="w-full rounded-xl py-4 text-center font-display font-bold tracking-widest text-red-400" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  AGOTADO
                </div>
              ) : missing > 0 ? (
                <div className="pb-soft w-full rounded-xl py-4 text-center font-display font-bold tracking-widest text-white/30">
                  PUNTOS INSUFICIENTES · FALTAN {formatPoints(missing)}
                </div>
              ) : (
                <Button className="w-full tracking-widest" onClick={() => setStep('confirm')} size="lg">
                  CANJEAR POR {formatPoints(reward.puntos_requeridos)} PUNTOS <Icon className="ml-1" color="currentColor" name="pointsSolid" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Page>
  )
}
