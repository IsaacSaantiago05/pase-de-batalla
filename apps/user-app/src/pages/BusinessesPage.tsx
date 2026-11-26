import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BusinessAvatar, businessAccent } from '@shared/business-profile'
import type { BusinessProfile } from '@shared/business-profile'
import { ChevronRight, EmptyState, Icon, Notice, ScreenHeader, SectionTitle } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet, listData } from '../lib/api'

export function BusinessesPage() {
  const goBack = useGoBack()
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<BusinessProfile[]>('/directory/businesses')
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
            const color = businessAccent(business.id)

            return (
              // Cada tarjeta abre el perfil del negocio (portada, foto de perfil y enlaces).
              <Link
                className="pb-card flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98]"
                key={business.id}
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                to={`/businesses/${business.id}`}
              >
                <BusinessAvatar accent={color} logoUrl={business.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-white">{business.nombre}</p>
                  <p className="text-xs text-white/40">{business.descripcion ?? 'Negocio participante'}</p>
                  {business.direccion && <p className="mt-1 text-xs text-white/40"><Icon className="mr-1" name="location" />
                      {business.direccion}</p>}
                  {business.telefono && (
                    <p className="mt-1 text-xs font-semibold" style={{ color }}>
                      <Icon className="mr-1" name="phone" />
                      {business.telefono}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} />
              </Link>
            )
          })}
        </div>
        {businesses.length === 0 && !error && <EmptyState icon="business" title="Aún no hay negocios participantes" />}

        {/* Invitacion para los dueños de negocios: abre la pantalla con los contactos de WhatsApp. */}
        <Link
          className="mt-6 flex items-center justify-center gap-2 py-2 text-center font-display text-sm font-bold tracking-wide text-yellow-400 underline decoration-yellow-400/50 underline-offset-4 transition-colors hover:text-yellow-300"
          to="/join"
        >
          <Icon color="currentColor" name="business" />
          ¿Te interesa unirte a Pase de Batalla?
        </Link>
      </div>
    </Page>
  )
}
