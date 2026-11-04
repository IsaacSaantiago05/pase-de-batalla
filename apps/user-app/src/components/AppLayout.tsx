import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

// Navegacion inferior del diseño: solo aparece en las pantallas principales.
const NAV_ITEMS = [
  { to: '/home', icon: '🏝️', label: 'Mi Isla' },
  { to: '/battle-pass', icon: '⭐', label: 'Pase' },
  { to: '/rewards', icon: '🎁', label: 'Recompensas' },
  { to: '/scan-qr', icon: '📷', label: 'Escanear' },
  { to: '/profile', icon: '👤', label: 'Perfil' },
]

function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-20 flex items-stretch"
      style={{
        background: 'linear-gradient(180deg, rgba(10,14,26,0.95) 0%, #080c18 100%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all active:scale-90" key={item.to} to={item.to}>
          {({ isActive }) => (
            <>
              <span className="text-xl" style={{ opacity: isActive ? 1 : 0.45 }}>
                {item.icon}
              </span>
              <span className="text-xs font-display font-semibold tracking-wide" style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
                {item.label}
              </span>
              {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full" style={{ background: '#f59e0b' }} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

// Columna central: ancho de celular en movil y un poco mas amplia en tablet/escritorio.
export function AppLayout() {
  const { pathname } = useLocation()
  const showNav = NAV_ITEMS.some((item) => item.to === pathname)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-2xl lg:max-w-3xl" style={{ background: '#080c18', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8)' }}>
      <div className="flex flex-1 flex-col anim-fade-up" key={pathname}>
        <Outlet />
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}

// Fondo de cada pantalla (cada una tiene su degradado en el diseño).
export function Page({ children, background = 'linear-gradient(180deg, #080c18 0%, #040d1e 100%)', className = '' }: { children: ReactNode; background?: string; className?: string }) {
  return (
    <div className={`flex flex-1 flex-col ${className}`} style={{ background }}>
      {children}
    </div>
  )
}

// Volver a la pantalla anterior; si se entro directo por URL, regresa al inicio.
export function useGoBack(fallback = '/home') {
  const navigate = useNavigate()

  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback)
  }
}
