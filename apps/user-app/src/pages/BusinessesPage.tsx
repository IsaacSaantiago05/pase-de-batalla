import { useEffect, useState } from 'react'
import { EmptyState, Notice, ScreenHeader, SectionTitle } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, listData } from '../lib/api'

type Business = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
}

// Colores de acento del diseño, asignados por negocio para distinguir las tarjetas.
const ACCENTS = ['#f59e0b', '#6366f1', '#10b981', '#a855f7', '#60a5fa', '#f472b6']

export function BusinessesPage() {
  const goBack = useGoBack()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Business[]>('/directory/businesses')
      .then((response) => setBusinesses(listData(response.data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar negocios'))
  }, [])

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="NEGOCIOS" />

      <div className="px-5 pb-6">
        <SectionTitle className="mb-3 text-white/40">{businesses.length} negocios participantes</SectionTitle>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-3 md:grid-cols-2">
          {businesses.map((business) => {
            const color = ACCENTS[business.id % ACCENTS.length]

            return (
              <div className="pb-card flex items-center gap-4 rounded-2xl p-4" key={business.id} style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  🏪
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-white">{business.nombre}</p>
                  <p className="text-xs text-white/40">{business.descripcion ?? 'Negocio participante'}</p>
                  {business.direccion && <p className="mt-1 text-xs text-white/40">📍 {business.direccion}</p>}
                  {business.telefono && (
                    <p className="mt-1 text-xs font-semibold" style={{ color }}>
                      ☎ {business.telefono}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {businesses.length === 0 && !error && <EmptyState icon="🏪" title="Aún no hay negocios participantes" />}
      </div>
    </Page>
  )
}
