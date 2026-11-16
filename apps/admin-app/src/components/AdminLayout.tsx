import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@shared/ui'

// Columna del panel: ancho de celular en movil y mas amplia en escritorio para las tablas.
export function AdminLayout() {
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-3xl lg:max-w-5xl" style={{ background: '#080c18', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8)' }}>
      <div className="flex flex-1 flex-col anim-fade-up" key={pathname}>
        <Outlet />
      </div>
    </div>
  )
}

// Volver a la pantalla anterior; si se entro directo por URL, regresa al dashboard.
export function useGoBack(fallback = '/dashboard') {
  const navigate = useNavigate()

  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback)
  }
}

// Pantalla interna del panel: encabezado con boton atras y contenido con margen.
export function AdminPage({
  title,
  children,
  background = 'linear-gradient(180deg, #080c18 0%, #040d1e 100%)',
}: {
  title: string
  children: ReactNode
  background?: string
}) {
  const goBack = useGoBack()

  return (
    <div className="flex flex-1 flex-col" style={{ background }}>
      <ScreenHeader onBack={goBack} title={title} />
      <div className="flex flex-col gap-4 px-5 pb-8">{children}</div>
    </div>
  )
}

// Contenedor de tablas con scroll horizontal en pantallas pequeñas.
export function TableCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="pb-card rounded-2xl p-4">
      {title && <p className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white/50">{title}</p>}
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}
