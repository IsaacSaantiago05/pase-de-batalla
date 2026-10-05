import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { apiPost } from '../lib/api'
import { clearSession } from '../lib/auth'

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
  const scannerElementId = 'qr-reader'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [token, setToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<RedeemResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    return () => {
      if (scannerRef.current !== null) {
        const current = scannerRef.current
        scannerRef.current = null

        if (current.getState() === Html5QrcodeScannerState.SCANNING || current.getState() === Html5QrcodeScannerState.PAUSED) {
          void current.stop().catch(() => undefined).finally(() => {
            current.clear()
          })
        } else {
          current.clear()
        }
      }
    }
  }, [])

  async function stopScanner() {
    const scanner = scannerRef.current
    if (scanner === null) {
      setIsScanning(false)
      return
    }

    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING || scanner.getState() === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop()
      }
    } catch {
      // Ignoramos fallos de cierre para no bloquear la UI.
    } finally {
      scanner.clear()
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  async function startScanner() {
    setError('')
    setMessage('')

    if (isScanning) {
      return
    }

    try {
      const scanner = new Html5Qrcode(scannerElementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          setToken(normalizeScannedToken(decodedText))
          setMessage('Token detectado por cámara. Puedes canjearlo ahora.')
          void stopScanner()
        },
        () => undefined,
      )

      setIsScanning(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar la cámara')
      await stopScanner()
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setResult(null)

    try {
      const parsedToken = normalizeScannedToken(token)
      if (!parsedToken) {
        setError('Ingresa o escanea un token válido.')
        return
      }

      const response = await apiPost<RedeemResult>('/qr/redeem', {
        token: parsedToken,
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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap gap-2 text-sm">
            {['/home', '/scan-qr', '/points', '/rewards', '/redemptions'].map((route) => (
              <Link className="rounded-md border px-2 py-1" key={route} to={route}>
                {route}
              </Link>
            ))}
          </nav>
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
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold">Canjear codigo QR</h1>
        <p className="mb-4 text-sm text-slate-600">Escanea con cámara o ingresa el token manualmente.</p>

        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                void startScanner()
              }}
              type="button"
            >
              {isScanning ? 'Escaneo activo' : 'Iniciar cámara'}
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                void stopScanner()
              }}
              type="button"
            >
              Detener cámara
            </button>
          </div>
          <div className="min-h-[260px] rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div id={scannerElementId} />
            {!isScanning && <p className="mt-2 text-xs text-slate-500">La cámara se mostrará aquí cuando inicies el escaneo.</p>}
          </div>
        </div>

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

function normalizeScannedToken(rawValue: string): string {
  const value = rawValue.trim()
  if (!value) {
    return ''
  }

  // Si el QR contiene una URL, intentamos extraer token por query param o por el último segmento.
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const tokenParam = url.searchParams.get('token')
      if (tokenParam && tokenParam.trim()) {
        return tokenParam.trim()
      }

      const lastPathSegment = url.pathname.split('/').filter(Boolean).at(-1)
      if (lastPathSegment) {
        return lastPathSegment.trim()
      }
    } catch {
      return value
    }
  }

  return value
}
