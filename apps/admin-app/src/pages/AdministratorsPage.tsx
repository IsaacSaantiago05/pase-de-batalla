import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@shared/api'
import { PasswordRequirements } from '@shared/PasswordRequirements'
import { PASSWORD_REQUIREMENTS_ERROR, meetsAllRequirements } from '@shared/password'
import { Button, ChipButton, EmptyState, FieldLabel, Icon, InputField, Notice, SectionTitle, StatusChip } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, listData } from '../lib/api'

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

const purpleBackground = 'linear-gradient(180deg, #0d0018 0%, #080c18 100%)'

export function AdministratorsPage() {
  const [items, setItems] = useState<AdminItem[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [negocioId, setNegocioId] = useState('')
  // Cuenta propia: su contraseña se cambia en Mi cuenta, no aqui.
  const [myId, setMyId] = useState<number | null>(null)
  // Restablecimiento en curso: a que cuenta y con que contraseña nueva.
  const [reset, setReset] = useState<{ id: number; password: string } | null>(null)
  const [savingReset, setSavingReset] = useState(false)
  // El resultado se muestra en la misma tarjeta de la cuenta, no arriba de la pantalla.
  const [resetError, setResetError] = useState('')
  const [resetDoneId, setResetDoneId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    try {
      const [adminsRes, businessesRes] = await Promise.all([
        apiGet<ListResponse>('/admin/administrators'),
        apiGet<BusinessList>('/businesses'),
      ])

      setItems(listData(adminsRes.data))
      setBusinesses(listData(businessesRes.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar datos')
    }
  }

  useEffect(() => {
    void loadData()
    apiGet<{ id: number }>('/auth/me').then((response) => setMyId(response.data.id)).catch(() => setMyId(null))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!meetsAllRequirements(password)) {
      setError(`La contraseña del administrador nuevo no cumple los requisitos. ${PASSWORD_REQUIREMENTS_ERROR}`)
      return
    }

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
      // La API explica en español que campo fallo (correo repetido, contraseña debil...).
      const fields = err instanceof ApiError ? Object.values(err.fields) : []
      setError(fields[0] ?? (err instanceof Error ? err.message : 'No fue posible crear administrador'))
    }
  }

  async function resetPassword(item: AdminItem) {
    if (!reset) return
    setResetError('')

    if (!meetsAllRequirements(reset.password)) {
      setResetError(PASSWORD_REQUIREMENTS_ERROR)
      return
    }

    setSavingReset(true)

    try {
      await apiPut(`/admin/administrators/${item.id}`, { password: reset.password, password_confirmation: reset.password })
      setReset(null)
      setResetDoneId(item.id)
    } catch (err) {
      if (err instanceof ApiError && err.fields.password) setResetError(err.fields.password)
      else setResetError(err instanceof Error ? err.message : 'No fue posible restablecer la contraseña')
    } finally {
      setSavingReset(false)
    }
  }

  const businessName = (id: number | null) => businesses.find((business) => business.id === id)?.nombre ?? (id ? `Negocio #${id}` : 'Sin negocio')

  return (
    <AdminPage background={purpleBackground} title="ADMINISTRADORES">
      <form className="pb-card flex flex-col gap-3 rounded-2xl p-5" onSubmit={onSubmit}>
        <p className="font-display text-sm font-bold uppercase tracking-widest text-purple-400">Nuevo administrador de negocio</p>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Nombre" onChange={(e) => setNombre(e.target.value)} value={nombre} />
          <InputField label="Correo" onChange={(e) => setCorreo(e.target.value)} type="email" value={correo} />
          <InputField autoComplete="new-password" label="Contraseña" onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="admin-business">Negocio</FieldLabel>
            <select className="pb-input" id="admin-business" onChange={(e) => setNegocioId(e.target.value)} value={negocioId}>
              <option value="">Selecciona negocio</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Requisitos de la contraseña temporal que se le entrega al negocio. */}
        {password !== '' && <PasswordRequirements value={password} />}
        <Button className="w-full tracking-widest" type="submit" variant="purple">
          CREAR ADMINISTRADOR
        </Button>
      </form>

      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <SectionTitle className="text-white/40">Administradores registrados ({items.length})</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div className="pb-card flex flex-col gap-3 rounded-2xl p-4" key={item.id} style={{ opacity: item.estado ? 1 : 0.6 }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon name="shield" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-sm font-bold text-white">{item.nombre}</p>
                  <StatusChip status={item.estado ? 'ACTIVO' : 'INACTIVO'} />
                </div>
                <p className="mt-0.5 truncate text-xs text-white/40">{item.correo}</p>
                <p className="mt-1.5 text-xs text-white/50">
                  {item.rol === 'ADMINISTRADOR_GENERAL' ? 'Administrador general' : `Negocio: ${businessName(item.negocio_id)}`}
                </p>
              </div>
            </div>

            {item.id === myId ? (
              <p className="text-xs text-white/40">
                Esta es tu cuenta. Cambia tu contraseña en{' '}
                <Link className="font-semibold text-purple-400 underline" to="/account">
                  Mi cuenta
                </Link>
                .
              </p>
            ) : reset?.id === item.id ? (
              <div className="flex flex-col gap-2">
                <InputField
                  autoComplete="new-password"
                  error={resetError || undefined}
                  id={`reset-password-${item.id}`}
                  label="Contraseña nueva"
                  onChange={(e) => setReset({ id: item.id, password: e.target.value })}
                  type="password"
                  value={reset.password}
                />
                <PasswordRequirements value={reset.password} />
                <div className="flex flex-wrap gap-2">
                  <ChipButton disabled={savingReset} onClick={() => void resetPassword(item)} tone="green">
                    {savingReset ? 'Guardando...' : 'Guardar contraseña'}
                  </ChipButton>
                  <ChipButton disabled={savingReset} onClick={() => setReset(null)}>
                    Cancelar
                  </ChipButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {resetDoneId === item.id && (
                  <p className="text-xs font-semibold text-emerald-400" role="status">
                    Contraseña restablecida y sesiones cerradas. Entrégale la nueva y pídele que la cambie en "Mi cuenta".
                  </p>
                )}
                <div>
                  <ChipButton
                    onClick={() => {
                      setResetError('')
                      setResetDoneId(null)
                      setReset({ id: item.id, password: '' })
                    }}
                    tone="purple"
                  >
                    Restablecer contraseña
                  </ChipButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {items.length === 0 && !error && <EmptyState icon="shield" title="Sin administradores" />}
    </AdminPage>
  )
}
