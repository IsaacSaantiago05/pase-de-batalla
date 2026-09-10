import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet, apiPost } from '../lib/api'

type AdminItem = {
  id: number
  nombre: string
  correo: string
  rol: string
  negocio_id: number | null
  estado: boolean
}

type ListResponse = {
  data: AdminItem[]
}

type Business = {
  id: number
  nombre: string
}

type BusinessList = {
  data: Business[]
}

export function AdministratorsPage() {
  const [items, setItems] = useState<AdminItem[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [negocioId, setNegocioId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    try {
      const [adminsRes, businessesRes] = await Promise.all([
        apiGet<ListResponse>('/admin/administrators'),
        apiGet<BusinessList>('/businesses'),
      ])

      setItems(adminsRes.data.data ?? [])
      setBusinesses(businessesRes.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar datos')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      await apiPost('/admin/administrators', {
        nombre,
        correo,
        password,
        password_confirmation: password,
        rol: 'ADMINISTRADOR_NEGOCIO',
        negocio_id: negocioId ? Number(negocioId) : null,
      })
      setNombre('')
      setCorreo('')
      setPassword('')
      setNegocioId('')
      setMessage('Administrador creado correctamente.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear administrador')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Crear administrador de negocio</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input className="rounded-md border p-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <input className="rounded-md border p-2" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="rounded-md border p-2" value={negocioId} onChange={(e) => setNegocioId(e.target.value)}>
            <option value="">Selecciona negocio</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.nombre}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-slate-900 p-2 text-white md:col-span-2" type="submit">
            Crear administrador
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Administradores registrados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Nombre</th>
                <th className="p-2">Correo</th>
                <th className="p-2">Rol</th>
                <th className="p-2">Negocio</th>
                <th className="p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-b" key={item.id}>
                  <td className="p-2">{item.nombre}</td>
                  <td className="p-2">{item.correo}</td>
                  <td className="p-2">{item.rol}</td>
                  <td className="p-2">{item.negocio_id ?? '-'}</td>
                  <td className="p-2">{item.estado ? 'Activo' : 'Inactivo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
