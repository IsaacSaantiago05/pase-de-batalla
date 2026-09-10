import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    try {
      const response = await apiPost<AuthResponse>('/auth/login', { correo, password })
      setAdminSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Pase de Batalla Admin</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full rounded-md border p-2" placeholder="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-slate-900 p-2 text-white" type="submit">Entrar</button>
      </form>
    </div>
  )
}
