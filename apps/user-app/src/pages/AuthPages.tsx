import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BackButton, Button, GLOW_SCREEN_BACKGROUND, GlowButton, Icon, InputField, Notice } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { useGoBack } from '../components/AppLayout'
import { PasswordRequirements } from '@shared/PasswordRequirements'
import { ApiError, apiPost } from '../lib/api'
import { setSession } from '../lib/auth'
import { PASSWORD_REQUIREMENTS_ERROR, meetsAllRequirements } from '@shared/password'

type AuthResponse = {
  user: { rol: string }
  token: string
}

type FieldErrors = Record<string, string>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// El backend responde las validaciones en ingles; se pasan a español las mas comunes.
function toSpanish(message: string): string {
  if (/already been taken/i.test(message)) return 'Este correo ya está registrado.'
  if (/is required/i.test(message)) return 'Este campo es obligatorio.'
  if (/valid email/i.test(message)) return 'Escribe un correo válido.'
  if (/at least 8/i.test(message)) return 'Debe tener mínimo 8 caracteres.'
  if (/confirmation does not match/i.test(message)) return 'Las contraseñas no coinciden.'
  if (/uppercase and one lowercase|at least one (symbol|number)/i.test(message)) return PASSWORD_REQUIREMENTS_ERROR
  return message
}

type Rules = Record<string, (value: string) => string | undefined>

function checkEmail(value: string) {
  if (!value.trim()) return 'Escribe tu correo.'
  if (!EMAIL_PATTERN.test(value.trim())) return 'Escribe un correo válido.'
  return undefined
}

// Mismas reglas del backend (LoginRequest / RegisterRequest).
const loginRules: Rules = {
  correo: checkEmail,
  password: (value) => (value ? undefined : 'Escribe tu contraseña.'),
}

const registerRules: Rules = {
  nombre: (value) => (value.trim() ? undefined : 'Escribe tu nombre de jugador.'),
  correo: checkEmail,
  password: (value) => (meetsAllRequirements(value) ? undefined : PASSWORD_REQUIREMENTS_ERROR),
}

function validateAll(rules: Rules, values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {}
  for (const [field, check] of Object.entries(rules)) {
    const message = check(values[field] ?? '')
    if (message) errors[field] = message
  }
  return errors
}

function withField(errors: FieldErrors, field: string, message: string | undefined): FieldErrors {
  if ((errors[field] ?? undefined) === message) return errors
  const next = { ...errors }
  if (message) next[field] = message
  else delete next[field]
  return next
}

// Validacion en vivo: al salir de un campo con texto se revisa, y si ya tiene error
// se vuelve a revisar con cada tecla para que el mensaje desaparezca en cuanto se corrige.
// No marca campos vacios solo por pasar por ellos; eso se avisa al enviar.
function useLiveValidation(rules: Rules) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function onFieldChange(field: string, value: string) {
    setFieldErrors((prev) => (prev[field] ? withField(prev, field, rules[field](value)) : prev))
  }

  function onFieldBlur(field: string, value: string) {
    if (!value) return
    setFieldErrors((prev) => withField(prev, field, rules[field](value)))
  }

  return { fieldErrors, setFieldErrors, onFieldChange, onFieldBlur }
}

// Lleva el foco al primer campo con error para que se vea y se pueda corregir de inmediato.
function focusFirstError(errors: FieldErrors, order: string[]) {
  const first = order.find((field) => errors[field])
  if (first) document.getElementById(`auth-${first}`)?.focus()
}

// Marco comun de las pantallas de acceso: boton atras, icono, titulo dorado y subtitulo.
function AuthShell({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle: string; children: ReactNode }) {
  const goBack = useGoBack('/welcome')

  return (
    <div className="flex flex-1 flex-col" style={{ background: GLOW_SCREEN_BACKGROUND }}>
      <div className="px-5 pt-5">
        <BackButton onBack={goBack} />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pb-8 pt-4">
        <div className="flex flex-col items-center gap-2 pt-2">
          <Icon className="text-6xl" color="#fbbf24" name={icon} style={{ filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.35))' }} />
          <h1 className="pb-text-gold text-center font-display text-3xl font-bold uppercase tracking-widest">{title}</h1>
          <p className="text-sm text-white/60">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { fieldErrors, setFieldErrors, onFieldChange, onFieldBlur } = useLiveValidation(loginRules)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const errors = validateAll(loginRules, { correo, password })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors, ['correo', 'password'])
      return
    }

    setSending(true)

    try {
      // Credenciales incorrectas se muestran como aviso general: no se indica cual de los dos campos fallo.
      const response = await apiPost<AuthResponse>('/auth/login', { correo: correo.trim(), password })
      setSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell icon="island" subtitle="Continúa tu aventura" title="Iniciar Sesión">
      <form className="flex flex-col gap-8" noValidate onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <InputField
            autoComplete="email"
            error={fieldErrors.correo}
            id="auth-correo"
            label="Correo electrónico"
            onBlur={(e) => onFieldBlur('correo', e.target.value)}
            onChange={(e) => {
              setCorreo(e.target.value)
              onFieldChange('correo', e.target.value)
            }}
            placeholder="tu@correo.com"
            type="email"
            valid={!checkEmail(correo)}
            value={correo}
          />
          <InputField
            autoComplete="current-password"
            error={fieldErrors.password}
            id="auth-password"
            label="Contraseña"
            onBlur={(e) => onFieldBlur('password', e.target.value)}
            onChange={(e) => {
              setPassword(e.target.value)
              onFieldChange('password', e.target.value)
            }}
            placeholder="••••••••"
            type="password"
            value={password}
          />
          <Link className="inline-flex min-h-11 items-center self-end text-sm font-semibold" style={{ color: '#f59e0b' }} to="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col gap-3">
          <GlowButton className="w-full tracking-widest" disabled={sending} type="submit">
            {sending ? 'ENTRANDO...' : 'INICIAR SESIÓN'}
          </GlowButton>
          <Button className="w-full" onClick={() => navigate('/register')} variant="ghost">
            Crear cuenta nueva
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { fieldErrors, setFieldErrors, onFieldChange, onFieldBlur } = useLiveValidation(registerRules)
  const [sending, setSending] = useState(false)
  const fieldOrder = ['nombre', 'correo', 'password']

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const errors = validateAll(registerRules, { nombre, correo, password })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors, fieldOrder)
      return
    }

    setSending(true)

    try {
      const response = await apiPost<AuthResponse>('/auth/register', {
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        // Ya no se pide repetirla (el ojo permite revisarla); el backend la sigue exigiendo.
        password_confirmation: password,
      })
      setSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/home')
    } catch (err) {
      // Errores por campo del servidor (por ejemplo, correo ya registrado) se muestran bajo su campo.
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        const serverErrors: FieldErrors = {}
        for (const [field, message] of Object.entries(err.fields)) {
          serverErrors[field] = toSpanish(message)
        }
        setFieldErrors(serverErrors)
        focusFirstError(serverErrors, fieldOrder)
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible registrar la cuenta')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell icon="sword" subtitle="Comienza tu aventura hoy" title="Crear Cuenta">
      <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <InputField
            autoCapitalize="none"
            autoComplete="nickname"
            error={fieldErrors.nombre}
            id="auth-nombre"
            label="Nombre de jugador"
            onBlur={(e) => onFieldBlur('nombre', e.target.value)}
            onChange={(e) => {
              setNombre(e.target.value)
              onFieldChange('nombre', e.target.value)
            }}
            spellCheck={false}
            placeholder="ej. JUGADOR01"
            value={nombre}
          />
          <InputField
            autoComplete="email"
            error={fieldErrors.correo}
            id="auth-correo"
            label="Correo electrónico"
            onBlur={(e) => onFieldBlur('correo', e.target.value)}
            onChange={(e) => {
              setCorreo(e.target.value)
              onFieldChange('correo', e.target.value)
            }}
            placeholder="tu@correo.com"
            type="email"
            valid={!checkEmail(correo)}
            value={correo}
          />
          <InputField
            autoComplete="new-password"
            error={fieldErrors.password}
            hint={<PasswordRequirements value={password} />}
            id="auth-password"
            label="Contraseña"
            onBlur={(e) => onFieldBlur('password', e.target.value)}
            onChange={(e) => {
              setPassword(e.target.value)
              onFieldChange('password', e.target.value)
            }}
            placeholder="Crea una contraseña segura"
            type="password"
            valid={meetsAllRequirements(password)}
            value={password}
          />
        </div>

        <div className="rounded-xl p-3 text-xs leading-relaxed text-white/60" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Al crear una cuenta aceptas nuestros <span style={{ color: '#f59e0b' }}>Términos y Condiciones</span> y{' '}
          <span style={{ color: '#f59e0b' }}>Política de Privacidad</span>.
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <GlowButton className="w-full tracking-widest" disabled={sending} type="submit">
          {sending ? 'CREANDO...' : 'CREAR CUENTA'}
        </GlowButton>

        <Link className="inline-flex min-h-11 items-center justify-center text-sm font-semibold" style={{ color: '#f59e0b' }} to="/login">
          Ya tengo una cuenta
        </Link>
      </form>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const response = await apiPost<null>('/auth/forgot-password', { correo })
      setMessage(response.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar la solicitud')
    }
  }

  return (
    <AuthShell icon="key" subtitle="Te enviaremos un enlace a tu correo" title="Recuperar Contraseña">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <InputField autoComplete="email" label="Correo electrónico" onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" type="email" value={correo} />
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="success">{message}</Notice>}
        <GlowButton className="w-full tracking-widest" type="submit">
          ENVIAR
        </GlowButton>
        <Link className="inline-flex min-h-11 items-center justify-center text-sm font-semibold" style={{ color: '#f59e0b' }} to="/login">
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [correo, setCorreo] = useState(searchParams.get('correo') ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!meetsAllRequirements(password)) {
      setPasswordError(PASSWORD_REQUIREMENTS_ERROR)
      document.getElementById('auth-password')?.focus()
      return
    }

    try {
      const response = await apiPost<null>('/auth/reset-password', {
        token,
        correo,
        password,
        password_confirmation: password,
      })

      setMessage(response.message)
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err instanceof Error ? toSpanish(err.message) : 'No fue posible restablecer la contraseña')
    }
  }

  return (
    <AuthShell icon="shield" subtitle="Elige una contraseña nueva" title="Nueva Contraseña">
      <form className="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <InputField label="Token" onChange={(e) => setToken(e.target.value)} value={token} />
          <InputField autoComplete="email" label="Correo electrónico" onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" type="email" value={correo} />
          <InputField
            autoComplete="new-password"
            error={passwordError}
            hint={<PasswordRequirements value={password} />}
            id="auth-password"
            label="Nueva contraseña"
            onChange={(e) => {
              setPassword(e.target.value)
              if (meetsAllRequirements(e.target.value)) setPasswordError('')
            }}
            placeholder="Crea una contraseña segura"
            type="password"
            valid={meetsAllRequirements(password)}
            value={password}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="success">{message}</Notice>}
        <GlowButton className="w-full tracking-widest" type="submit">
          GUARDAR CONTRASEÑA
        </GlowButton>
        <Link className="inline-flex min-h-11 items-center justify-center text-sm font-semibold" style={{ color: '#f59e0b' }} to="/login">
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthShell>
  )
}
