import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BusinessContact, BusinessCover, BusinessLinks, businessAccent } from '@shared/business-profile'
import type { BusinessProfile } from '@shared/business-profile'
import { BackButton, LoadingState, Notice, ScreenHeader, SectionTitle } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { apiGet } from '../lib/api'

// Perfil de un negocio participante: portada, foto de perfil, datos de contacto y sus enlaces.
export function BusinessProfilePage() {
  const { id } = useParams()
  const goBack = useGoBack('/businesses')
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setBusiness(null)
    setError('')

    apiGet<BusinessProfile>(`/directory/businesses/${id}`)
      .then((response) => setBusiness(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar el negocio'))
  }, [id])

  // Sin datos todavia (o con error) se muestra el encabezado normal para poder volver.
  if (!business) {
    return (
      <Page>
        <ScreenHeader onBack={goBack} title="NEGOCIO" />
        <div className="px-5 pb-6">{error ? <Notice tone="error">{error}</Notice> : <LoadingState text="Cargando negocio..." />}</div>
      </Page>
    )
  }

  const accent = businessAccent(business.id)

  return (
    <Page>
      <BusinessCover
        accent={accent}
        descripcion={business.descripcion}
        logoUrl={business.logo_url}
        nombre={business.nombre}
        portadaUrl={business.portada_url}
        topLeft={
          // Fondo oscuro propio: el boton debe leerse sobre cualquier foto.
          <div className="rounded-xl" style={{ background: 'rgba(8,12,24,0.7)', backdropFilter: 'blur(6px)' }}>
            <BackButton onBack={goBack} />
          </div>
        }
      />

      <div className="flex flex-col gap-5 px-5 pb-8 pt-5">
        <BusinessContact accent={accent} direccion={business.direccion} telefono={business.telefono} />

        {business.enlaces.length > 0 && (
          <div className="flex flex-col gap-3">
            <SectionTitle className="text-white/40">Enlaces</SectionTitle>
            <BusinessLinks links={business.enlaces} />
          </div>
        )}
      </div>
    </Page>
  )
}
