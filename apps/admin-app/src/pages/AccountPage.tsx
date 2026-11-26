import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '@shared/api'
import { PasswordRequirements } from '@shared/PasswordRequirements'
import { PASSWORD_REQUIREMENTS_ERROR, meetsAllRequirements } from '@shared/password'
import { Button, Icon, InputField, Notice, SectionTitle } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiGet, apiPut } from '../lib/api'

type Me = {
  nombre: string
  correo: string
  rol: string
}

type FieldErrors = {
  actual?: string
  nueva?: string
  confirmacion?: string
}

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR_GENERAL: 'Administrador general',
  ADMINISTRADOR_NEGOCIO: 'Administrador de negocio',
}

// Cuenta del administrador que inicio sesion: sus datos y el cambio de su propia contraseña.
export function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiGet<Me>('/auth/me')
      .then((response) => setMe(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar tu cuenta'))
  }, [])

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (actual === '') errors.actual = 'Escribe tu contraseña actual.'
    // Los mismos requisitos que valida la API; la lista bajo el campo los va marcando.
    if (!meetsAllRequirements(nueva)) errors.nueva = PASSWORD_REQUIREMENTS_ERROR
    else if (nueva === actual) errors.nueva = 'La contraseña nueva debe ser distinta de la actual.'
    if (confirmacion !== nueva) errors.confirmacion = 'La confirmación no coincide con la contraseña nueva.'

    return errors
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)

    try {
      // La API exige la contraseña actual y cierra las demas sesiones abiertas.
      await apiPut('/profile', { password: nueva, password_confirmation: confirmacion, password_actual: actual })
      setActual('')
      setNueva('')
      setConfirmacion('')
      setMessage('Contraseña actualizada. Se cerraron tus otras sesiones abiertas.')
    } catch (err) {
      if (err instanceof ApiError && (err.fields.password_actual || err.fields.password)) {
        setFieldErrors({ actual: err.fields.password_actual, nueva: err.fields.password })
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible cambiar la contraseña')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage title="MI CUENTA">
      {me && (
        <div className="pb-card flex items-center gap-3 rounded-2xl p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Icon name="user" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-white">{me.nombre}</p>
            <p className="truncate text-sm text-white/50">{me.correo}</p>
            <p className="mt-0.5 text-xs text-white/40">{ROLE_LABEL[me.rol] ?? me.rol}</p>
          </div>
        </div>
      )}

      <SectionTitle className="text-white/40">Cambiar contraseña</SectionTitle>
      <form className="pb-card flex flex-col gap-3 rounded-2xl p-5" noValidate onSubmit={onSubmit}>
        <InputField
          autoComplete="current-password"
          error={fieldErrors.actual}
          label="Contraseña actual"
          onChange={(e) => setActual(e.target.value)}
          type="password"
          value={actual}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField
            autoComplete="new-password"
            error={fieldErrors.nueva}
            label="Contraseña nueva"
            onChange={(e) => setNueva(e.target.value)}
            type="password"
            value={nueva}
          />
          <InputField
            autoComplete="new-password"
            error={fieldErrors.confirmacion}
            label="Confirmar contraseña nueva"
            onChange={(e) => setConfirmacion(e.target.value)}
            type="password"
            value={confirmacion}
          />
        </div>
        <PasswordRequirements value={nueva} />
        <p className="text-xs text-white/40">
          Si recibiste una contraseña temporal, cámbiala aquí por una que solo tú conozcas.
        </p>
        <Button className="w-full tracking-widest" disabled={saving} type="submit">
          {saving ? 'GUARDANDO...' : 'CAMBIAR CONTRASEÑA'}
        </Button>
      </form>

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </AdminPage>
  )
}
