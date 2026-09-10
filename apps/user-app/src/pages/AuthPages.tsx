import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { setSession } from '../lib/auth'

type AuthResponse = {
  user: { rol: string }
  token: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    try {
      const response = await apiPost<AuthResponse>('/auth/login', { correo, password })
      setSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Pase de Batalla</h1>
      <p className="text-sm text-slate-600">Inicia sesión para continuar.</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full rounded-md border p-2" placeholder="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-slate-900 p-2 text-white" type="submit">Entrar</button>
      </form>
      <div className="flex justify-between text-sm">
        <Link className="text-slate-700 underline" to="/register">Crear cuenta</Link>
        <Link className="text-slate-700 underline" to="/forgot-password">Recuperar contraseña</Link>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    try {
      const response = await apiPost<AuthResponse>('/auth/register', {
        nombre,
        correo,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSession({ token: response.data.token, role: response.data.user.rol })
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar la cuenta')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full rounded-md border p-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="w-full rounded-md border p-2" placeholder="Confirmar contraseña" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-slate-900 p-2 text-white" type="submit">Registrarme</button>
      </form>
      <Link className="text-sm text-slate-700 underline" to="/login">Ya tengo cuenta</Link>
    </div>
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
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full rounded-md border p-2" placeholder="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button className="w-full rounded-md bg-slate-900 p-2 text-white" type="submit">Enviar</button>
      </form>
      <Link className="text-sm text-slate-700 underline" to="/login">Volver</Link>
    </div>
  )
}
