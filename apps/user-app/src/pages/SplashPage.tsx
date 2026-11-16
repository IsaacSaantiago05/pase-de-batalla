import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Icon, IslandView } from '@shared/ui'
import { getSession } from '../lib/auth'

export function SplashPage() {
  const navigate = useNavigate()

  if (getSession()) {
    return <Navigate to="/home" replace />
  }

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-between overflow-hidden px-6 py-10"
      style={{ background: 'linear-gradient(180deg, #040d1e 0%, #0a1628 40%, #080c18 100%)' }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      <div />

      <div className="flex w-full flex-col items-center gap-6 anim-fade-up">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl text-5xl anim-pulse-gold"
              style={{ background: 'linear-gradient(135deg, #1a2a0a 0%, #0a1628 100%)', border: '2px solid rgba(245,158,11,0.4)' }}
            >
              <Icon color="#fbbf24" name="island" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#f59e0b', color: '#000' }}>
              <Icon color="#000" name="pointsSolid" />
            </div>
          </div>

          <h1 className="flex flex-col items-center font-display font-bold uppercase tracking-widest">
            <span className="pb-text-gold text-4xl">Pase de</span>
            <span className="pb-text-gold -mt-2 text-5xl">Batalla</span>
          </h1>
        </div>

        <div className="w-full max-w-sm">
          <IslandView level={12} size="md" />
        </div>

        <div className="text-center">
          <p className="font-display text-2xl font-bold tracking-wide text-white">Convierte tus compras en progreso</p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">Gana puntos, sube de nivel y construye tu propia isla.</p>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Button className="w-full tracking-widest" onClick={() => navigate('/register')} size="lg">
          COMENZAR
        </Button>
        <button className="text-sm font-semibold text-white/50 transition-colors hover:text-white/80" onClick={() => navigate('/login')} type="button">
          Ya tengo una cuenta
        </button>
      </div>
    </div>
  )
}
