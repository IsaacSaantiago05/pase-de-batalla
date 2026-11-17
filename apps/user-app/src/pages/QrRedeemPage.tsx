import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Button, GlowButton, Icon, Notice, ScreenHeader, formatPoints } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
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

// Esquinas del visor, metidas un poco hacia dentro para que sigan la curva del marco.
const CORNERS = [
  { top: 10, left: 10, borderTop: '3px solid #f59e0b', borderLeft: '3px solid #f59e0b', borderRadius: '14px 0 0 0' },
  { top: 10, right: 10, borderTop: '3px solid #f59e0b', borderRight: '3px solid #f59e0b', borderRadius: '0 14px 0 0' },
  { bottom: 10, left: 10, borderBottom: '3px solid #f59e0b', borderLeft: '3px solid #f59e0b', borderRadius: '0 0 0 14px' },
  { bottom: 10, right: 10, borderBottom: '3px solid #f59e0b', borderRight: '3px solid #f59e0b', borderRadius: '0 0 14px 0' },
]

const divider = <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

export function QrRedeemPage() {
  const scannerElementId = 'qr-reader'
  const navigate = useNavigate()
  const goBack = useGoBack()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [result, setResult] = useState<RedeemResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

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
    setCameraError('')

    if (isScanning) {
      return
    }

    try {
      const scanner = new Html5Qrcode(scannerElementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 200 },
        (decodedText) => {
          void stopScanner()
          void redeem(decodedText)
        },
        () => undefined,
      )

      setIsScanning(true)
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'No fue posible iniciar la cámara')
      await stopScanner()
    }
  }

  async function redeem(rawToken: string) {
    const parsedToken = normalizeScannedToken(rawToken)
    if (!parsedToken) {
      setCameraError('Ingresa o escanea un código válido.')
      return
    }

    setRedeeming(true)
    setError('')

    try {
      const response = await apiPost<RedeemResult>('/qr/redeem', { token: parsedToken })
      setResult(response.data)
      setToken('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible canjear el QR')
    } finally {
      setRedeeming(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void redeem(token)
  }

  function retry() {
    setError('')
    setResult(null)
  }

  if (result) {
    return (
      <Page background="linear-gradient(180deg, #021a0e 0%, #080c18 100%)" className="items-center justify-center gap-8 px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 anim-scale-in">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full text-6xl"
            style={{ background: 'linear-gradient(135deg, #10b98120, #059669 20%)', border: '3px solid #10b981', boxShadow: '0 0 48px rgba(16,185,129,0.4)' }}
          >
            <Icon name="pointsSolid" />
          </div>

          <div className="text-center">
            <p className="pb-text-gold font-display text-5xl font-bold tracking-wider">+{formatPoints(result.movimiento.cantidad)} PUNTOS</p>
            <p className="mt-1 font-display text-xl font-bold tracking-wide text-green-400">¡Puntos agregados!</p>
          </div>

          <div className="flex w-full flex-col gap-3 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #10b98112, #1a2235)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold tracking-wide text-white/60">Puntos ganados</span>
              <span className="font-mono-game font-bold text-yellow-400">+{formatPoints(result.movimiento.cantidad)}</span>
            </div>
            {divider}
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold tracking-wide text-white/60">Nuevo total</span>
              <span className="font-mono-game font-bold text-yellow-400">{formatPoints(result.saldo_global)} PTS</span>
            </div>
          </div>
        </div>

        <Button className="w-full max-w-sm tracking-widest" onClick={() => navigate('/home')} size="lg">
          CONTINUAR
        </Button>
      </Page>
    )
  }

  if (error) {
    return (
      <Page background="linear-gradient(180deg, #1a0404 0%, #080c18 100%)" className="items-center justify-center gap-8 px-6 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 anim-scale-in">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full text-5xl"
            style={{ background: 'linear-gradient(135deg, #ef444420, #dc2626 20%)', border: '3px solid #ef4444', boxShadow: '0 0 48px rgba(239,68,68,0.35)' }}
          >
            <Icon color="#f87171" name="close" />
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold tracking-wide text-red-400">Código no válido</p>
            <p className="mt-2 text-sm text-white/60">{error}</p>
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button className="w-full tracking-widest" onClick={retry} variant="danger">
            INTENTAR NUEVAMENTE
          </Button>
          <button className="text-center text-sm font-semibold text-white/40" onClick={goBack} type="button">
            Volver atrás
          </button>
        </div>
      </Page>
    )
  }

  return (
    <Page background="linear-gradient(180deg, #040d1e 0%, #080c18 100%)">
      <ScreenHeader onBack={goBack} title="ESCANEAR QR" />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-8">
        <div
          className="relative h-64 w-64 overflow-hidden rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(245,158,11,0.4)', boxShadow: '0 0 48px rgba(245,158,11,0.1), inset 0 0 32px rgba(245,158,11,0.05)' }}
        >
          {/* La camara de html5-qrcode se dibuja aqui dentro. */}
          <div className="absolute inset-0 [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover" id={scannerElementId} />

          {!isScanning && (
            <button className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/50" onClick={() => void startScanner()} type="button">
              <Icon className="text-5xl" name="camera" />
              <span className="font-display text-sm font-bold tracking-widest">{redeeming ? 'VALIDANDO...' : 'TOCA PARA ACTIVAR LA CÁMARA'}</span>
            </button>
          )}

          {CORNERS.map((style, i) => (
            <div className="pointer-events-none absolute h-8 w-8" key={i} style={style} />
          ))}

          {isScanning && (
            <div
              className="pointer-events-none absolute h-0.5 w-full anim-scan-line"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #f59e0b 30%, #fcd34d 50%, #f59e0b 70%, transparent 100%)', boxShadow: '0 0 12px rgba(245,158,11,0.8)' }}
            />
          )}
        </div>

        <div className="w-full max-w-sm text-center">
          <p className="font-display text-lg font-bold tracking-wide text-white">{isScanning ? 'Escaneando...' : 'Listo para escanear'}</p>
          <p className="mx-auto mt-1 max-w-xs text-balance text-sm leading-relaxed text-white/50">Escanea el código QR proporcionado por el negocio.</p>
          <p className="mx-auto mt-2 max-w-xs text-balance text-xs text-white/30">Los códigos QR solo pueden utilizarse una vez y tienen fecha de expiración.</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          {cameraError && <Notice tone="error">{cameraError}</Notice>}
          {isScanning ? (
            <Button className="w-full" onClick={() => void stopScanner()} variant="ghost">
              DETENER CÁMARA
            </Button>
          ) : (
            <GlowButton className="w-full tracking-widest" disabled={redeeming} onClick={() => void startScanner()}>
              ACTIVAR CÁMARA
            </GlowButton>
          )}

          {/* Respaldo cuando la camara no esta disponible: el negocio puede dictar el codigo. */}
          <form className="mt-1 flex items-stretch gap-2" onSubmit={onSubmit}>
            <input className="pb-input min-w-0 flex-1" onChange={(e) => setToken(e.target.value)} placeholder="¿Sin cámara? Escribe el código" value={token} />
            <GlowButton compact disabled={redeeming || !token.trim()} tone="green" type="submit">
              CANJEAR
            </GlowButton>
          </form>
        </div>
      </div>
    </Page>
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
