import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, ChipButton, EmptyState, Icon, InputField, Notice, SectionTitle, StatusChip } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPatch, apiPost, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'

type Business = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  correo: string | null
  estado: boolean
}

type BusinessList = {
  data: Business[]
}

const purpleBackground = 'linear-gradient(180deg, #0d0018 0%, #080c18 100%)'

const emptyForm = { nombre: '', descripcion: '', direccion: '', telefono: '', correo: '' }

// Alta y activacion de negocios: solo el administrador general (la API tambien lo restringe).
export function BusinessesPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [items, setItems] = useState<Business[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    try {
      const response = await apiGet<BusinessList>('/businesses')
      setItems(listData(response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los negocios')
    }
  }

  useEffect(() => {
    if (isGeneral) void loadData()
  }, [isGeneral])

  if (!isGeneral) {
    return <Navigate replace to="/dashboard" />
  }

  const setField = (field: keyof typeof emptyForm) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    // Los campos opcionales vacios se mandan como null para no guardar cadenas vacias.
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() === '' ? null : value.trim()]))

    try {
      await apiPost('/businesses', payload)
      setForm(emptyForm)
      setMessage('Negocio creado correctamente.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el negocio')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(business: Business) {
    setError('')
    setMessage('')
    setUpdatingId(business.id)

    try {
      await apiPatch(`/businesses/${business.id}/status`, { estado: !business.estado })
      setMessage(business.estado ? `${business.nombre} quedó inactivo.` : `${business.nombre} quedó activo.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cambiar el estado del negocio')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AdminPage background={purpleBackground} title="NEGOCIOS">
      <form className="pb-card flex flex-col gap-3 rounded-2xl p-5" onSubmit={onSubmit}>
        <p className="font-display text-sm font-bold uppercase tracking-widest text-purple-400">Nuevo negocio</p>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Nombre" maxLength={150} onChange={(e) => setField('nombre')(e.target.value)} required value={form.nombre} />
          <InputField label="Correo de contacto" maxLength={150} onChange={(e) => setField('correo')(e.target.value)} type="email" value={form.correo} />
          <InputField label="Teléfono" maxLength={40} onChange={(e) => setField('telefono')(e.target.value)} type="tel" value={form.telefono} />
          <InputField label="Dirección" maxLength={255} onChange={(e) => setField('direccion')(e.target.value)} value={form.direccion} />
          <InputField className="md:col-span-2" label="Descripción" onChange={(e) => setField('descripcion')(e.target.value)} value={form.descripcion} />
        </div>
        <Button className="w-full tracking-widest" disabled={saving || form.nombre.trim() === ''} type="submit" variant="purple">
          {saving ? 'CREANDO...' : 'CREAR NEGOCIO'}
        </Button>
      </form>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <SectionTitle className="text-white/40">Negocios registrados ({items.length})</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((business) => (
          <div className="pb-card flex items-start gap-3 rounded-2xl p-4" key={business.id} style={{ opacity: business.estado ? 1 : 0.6 }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon name="business" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-sm font-bold text-white">{business.nombre}</p>
                <StatusChip status={business.estado ? 'ACTIVO' : 'INACTIVO'} />
              </div>
              {business.descripcion && <p className="mt-0.5 truncate text-xs text-white/50">{business.descripcion}</p>}
              <p className="mt-1.5 truncate text-xs text-white/40">{[business.correo, business.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
              {business.direccion && <p className="truncate text-xs text-white/40">{business.direccion}</p>}
            </div>
            <ChipButton disabled={updatingId === business.id} onClick={() => void toggleStatus(business)} tone={business.estado ? 'red' : 'green'}>
              {business.estado ? 'Desactivar' : 'Activar'}
            </ChipButton>
          </div>
        ))}
      </div>
      {items.length === 0 && !error && <EmptyState icon="business" title="Sin negocios" />}
    </AdminPage>
  )
}
