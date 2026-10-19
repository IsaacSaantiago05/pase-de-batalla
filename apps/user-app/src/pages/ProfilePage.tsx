import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPut } from '../lib/api'
import { clearSession } from '../lib/auth'

type Profile = {
  id: number
  nombre: string
  correo: string
  fecha_registro: string | null
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Profile>('/auth/me')
      .then((response) => {
        setProfile(response.data)
        setNombre(response.data.nombre)
        setCorreo(response.data.correo)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar el perfil'))
  }, [])

  async function saveData(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const response = await apiPut<Profile>('/profile', { nombre, correo })
      setProfile(response.data)
      setMessage('Datos actualizados.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el perfil')
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiPut<Profile>('/profile', {
        password_actual: passwordActual,
        password,
        password_confirmation: passwordConfirmation,
      })
      setPasswordActual('')
      setPassword('')
      setPasswordConfirmation('')
      setMessage('Contraseña actualizada. Se cerraron tus otras sesiones.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cambiar la contraseña')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Mi perfil</h1>
          <div className="flex gap-2">
            <Link className="rounded-md border px-3 py-1 text-sm" to="/home">
              Volver
            </Link>
            <button
              className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white"
              onClick={() => {
                clearSession()
                location.href = '/login'
              }}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        {profile?.fecha_registro && (
          <p className="mb-4 text-sm text-slate-500">Miembro desde {new Date(profile.fecha_registro).toLocaleDateString()}</p>
        )}
        {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <form className="space-y-3" onSubmit={saveData}>
          <label className="block text-sm">
            Nombre
            <input className="mt-1 w-full rounded-md border p-2" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="block text-sm">
            Correo
            <input className="mt-1 w-full rounded-md border p-2" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
            Guardar datos
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Cambiar contraseña</h2>
        <form className="space-y-3" onSubmit={savePassword}>
          <input className="w-full rounded-md border p-2" placeholder="Contraseña actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} />
          <input className="w-full rounded-md border p-2" placeholder="Nueva contraseña (min. 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full rounded-md border p-2" placeholder="Repite la nueva contraseña" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
