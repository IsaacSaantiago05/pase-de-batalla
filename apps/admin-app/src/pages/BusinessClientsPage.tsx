import { useEffect, useState } from 'react'
import { EmptyState, FieldLabel, Icon, Notice, formatDate, formatPoints } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Client = {
  usuario_id: number
  nombre: string
  correo: string
  puntos_ganados: number
  visitas: number
  ultima_visita: string | null
}

type Business = {
  id: number
  nombre: string
}

export function BusinessClientsPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (isGeneral) {
      apiGet<Business[]>('/businesses')
        .then((response) => setBusinesses(listData(response.data)))
        .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar negocios'))
    }
  }, [isGeneral])

  useEffect(() => {
    if (isGeneral && !businessId) {
      setClients([])
      return
    }

    const query = isGeneral ? `?negocio_id=${businessId}` : ''
    apiGet<Client[]>(`/business-clients${query}`)
      .then((response) => {
        setError('')
        setClients(listData(response.data))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar clientes'))
  }, [isGeneral, businessId])

  return (
    <AdminPage title="CLIENTES">
      <p className="text-sm text-white/50">Clientes que han ganado o usado puntos en el negocio.</p>

      {isGeneral && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="clients-business">Negocio</FieldLabel>
          <select className="pb-input" id="clients-business" onChange={(e) => setBusinessId(e.target.value)} value={businessId}>
            <option value="">Elige un negocio</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-3 md:grid-cols-2">
        {clients.map((client) => (
          <div className="pb-card flex items-start gap-3 rounded-2xl p-4" key={client.usuario_id}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon name="avatar" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-white">{client.nombre}</p>
              <p className="mt-0.5 truncate text-xs text-white/40">{client.correo}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-mono-game text-yellow-400"><Icon className="mr-1" name="pointsSolid" />
                  {formatPoints(client.puntos_ganados)}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/50">{client.visitas} visitas</span>
                <span className="text-white/30">·</span>
                <span className="text-white/50">Última: {formatDate(client.ultima_visita, true)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {clients.length === 0 && !error && <EmptyState icon="clients" title={isGeneral && !businessId ? 'Elige un negocio para ver sus clientes' : 'Sin clientes todavía'} />}
    </AdminPage>
  )
}
