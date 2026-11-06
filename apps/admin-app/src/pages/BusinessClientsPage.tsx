import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Clientes del negocio</h1>
        <Link className="rounded-md border px-3 py-1 text-sm" to="/dashboard">
          Volver
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">Clientes que han ganado o usado puntos en el negocio.</p>

      {isGeneral && (
        <select className="mb-4 rounded-md border p-2" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
          <option value="">Elige un negocio</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.nombre}
            </option>
          ))}
        </select>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Cliente</th>
              <th className="p-2">Correo</th>
              <th className="p-2">Visitas</th>
              <th className="p-2">Puntos ganados</th>
              <th className="p-2">Ultima visita</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr className="border-b" key={client.usuario_id}>
                <td className="p-2">{client.nombre}</td>
                <td className="p-2">{client.correo}</td>
                <td className="p-2">{client.visitas}</td>
                <td className="p-2">{client.puntos_ganados}</td>
                <td className="p-2">{client.ultima_visita ? new Date(client.ultima_visita).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td className="p-2 text-slate-500" colSpan={5}>
                  {isGeneral && !businessId ? 'Elige un negocio para ver sus clientes.' : 'Sin clientes todavia.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
