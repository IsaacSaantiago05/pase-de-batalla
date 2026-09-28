import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiPost } from '../lib/api'

type RedeemResult = {
  movimiento: {
    id: number
    qr_id: number | null
    cantidad: number
    tipo: string
    fecha: string
  }
  saldo_global: number
  nivel_id: number | null
}

export function QrRedeemPage() {
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<RedeemResult | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setResult(null)

    try {
      const response = await apiPost<RedeemResult>('/qr/redeem', {
        token: token.trim(),
      })

      setMessage('QR canjeado correctamente.')
      setResult(response.data)
      setToken('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible canjear el QR')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold">Canjear codigo QR</h1>
        <p className="mb-4 text-sm text-slate-600">Ingresa el token del QR generado por el negocio.</p>

        <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSubmit}>
          <input
            className="w-full rounded-md border p-2"
            placeholder="TOKEN-QR-..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white" type="submit">
            Canjear
          </button>
        </form>

        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Resultado del canje</h2>
          <div className="grid gap-2 text-sm text-slate-700">
            <p>
              Movimiento: <span className="font-semibold text-slate-900">#{result.movimiento.id}</span>
            </p>
            <p>
              Puntos recibidos: <span className="font-semibold text-slate-900">{result.movimiento.cantidad}</span>
            </p>
            <p>
              Saldo global: <span className="font-semibold text-slate-900">{result.saldo_global}</span>
            </p>
            <p>
              Nivel actual: <span className="font-semibold text-slate-900">{result.nivel_id ?? 'Sin nivel'}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
