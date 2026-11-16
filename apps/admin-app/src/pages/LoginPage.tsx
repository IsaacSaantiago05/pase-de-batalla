import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Icon, InputField, Notice } from '@shared/ui'
import { apiPost } from '../lib/api'
import { setAdminSession } from '../lib/auth'

type AuthResponse = {
  user: { rol: string }
  token: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('admin@pasedebatalla.local')
  const [password, setPassword] = useState('AdminDev1234')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSending(true)

    try {
      const response = await apiPost<AuthResponse>('/auth/login', { correo, password })
      setAdminSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center" style={{ background: 'linear-gradient(180deg, #060c04 0%, #080c18 100%)' }}>
      <form className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-10" onSubmit={onSubmit}>
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Icon name="business" />
          </div>
          <p className="font-display text-xs uppercase tracking-widest text-white/40">Pase de Batalla</p>
          <h1 className="font-display text-3xl font-bold tracking-widest text-yellow-400">ADMINISTRACIÓN</h1>
          <p className="text-sm text-white/40">Acceso para negocios y administración general</p>
        </div>

        <div className="flex flex-col gap-4">
          <InputField autoComplete="email" label="Correo electrónico" onChange={(e) => setCorreo(e.target.value)} type="email" value={correo} />
          <InputField autoComplete="current-password" label="Contraseña" onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button className="w-full tracking-widest" disabled={sending} type="submit">
          {sending ? 'ENTRANDO...' : 'INICIAR SESIÓN'}
        </Button>
      </form>
    </div>
  )
}
