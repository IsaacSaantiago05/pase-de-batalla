import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, GlowButton, Icon, InputField, Notice, ScreenHeader, formatDate, formatPoints } from '@shared/ui'
import type { IconName } from '@shared/ui'
import { Page, useGoBack } from '../components/AppLayout'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { apiGet, apiPut, listData } from '../lib/api'
import { clearSession } from '../lib/auth'
import { PASSWORD_REQUIREMENTS_ERROR, meetsAllRequirements } from '../lib/password'
import { levelInfo } from '../lib/progress'
import type { BattlePassProgress } from '../lib/progress'

type Profile = {
  id: number
  nombre: string
  correo: string
  fecha_registro: string | null
}

type Panel = 'none' | 'data' | 'password'

export function ProfilePage() {
  const navigate = useNavigate()
  const goBack = useGoBack()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [redemptions, setRedemptions] = useState<number | null>(null)
  const [panel, setPanel] = useState<Panel>('none')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
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
    apiGet<{ saldo_global: number }>('/points/balance').then((response) => setBalance(response.data.saldo_global)).catch(() => setBalance(null))
    apiGet<BattlePassProgress>('/battle-pass/progress').then((response) => setProgress(response.data)).catch(() => setProgress(null))
    apiGet<{ data: unknown[] }>('/redemptions/my').then((response) => setRedemptions(listData(response.data).length)).catch(() => setRedemptions(null))
  }, [])

  async function saveData(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const response = await apiPut<Profile>('/profile', { nombre, correo })
      setProfile(response.data)
      setMessage('Datos actualizados.')
      setPanel('none')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el perfil')
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!meetsAllRequirements(password)) {
      setPasswordError(PASSWORD_REQUIREMENTS_ERROR)
      document.getElementById('profile-password')?.focus()
      return
    }

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
      setPanel('none')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cambiar la contraseña')
    }
  }

  function togglePanel(next: Panel) {
    setMessage('')
    setError('')
    setPanel((current) => (current === next ? 'none' : next))
  }

  const info = levelInfo(progress)
  const menu = [
    { icon: 'edit' as IconName, label: 'Editar perfil', action: () => togglePanel('data'), open: panel === 'data' },
    { icon: 'key' as IconName, label: 'Cambiar contraseña', action: () => togglePanel('password'), open: panel === 'password' },
    { icon: 'history' as IconName, label: 'Ver historial', action: () => navigate('/history') },
    { icon: 'ticket' as IconName, label: 'Mis canjes', action: () => navigate('/redemptions') },
    { icon: 'business' as IconName, label: 'Negocios participantes', action: () => navigate('/businesses') },
    { icon: 'island' as IconName, label: 'Personalizar mi isla', action: () => navigate('/island') },
  ]

  return (
    <Page>
      <ScreenHeader onBack={goBack} title="PERFIL" />

      <div className="pb-6">
        <div className="mb-5 px-5">
          <div className="flex flex-col items-center gap-3 rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #0d1424, #1a2235)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-4xl"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1424)', border: '3px solid rgba(245,158,11,0.4)', boxShadow: '0 0 24px rgba(245,158,11,0.15)' }}
            >
              <Icon name="avatar" />
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold uppercase tracking-widest text-white">{profile?.nombre ?? '-'}</p>
              <span
                className="mt-1 inline-block rounded-full px-3 py-1 font-display text-xs font-bold"
                style={{ background: 'rgba(245,158,11,0.18)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                NV. {info.level}
              </span>
            </div>

            <div className="mt-1 flex gap-6">
              {[
                { value: balance === null ? '-' : formatPoints(balance), label: 'Puntos', color: 'text-yellow-400' },
                { value: String(info.level), label: 'Nivel', color: 'text-purple-400' },
                { value: redemptions === null ? '-' : String(redemptions), label: 'Canjes', color: 'text-emerald-400' },
              ].map((stat, i) => (
                <div className="flex gap-6" key={stat.label}>
                  {i > 0 && <div className="w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                  <div className="text-center">
                    <p className={`font-mono-game text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="font-display text-xs uppercase tracking-wide text-white/40">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 px-5">
          <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Nombre', value: profile?.nombre ?? '-' },
              { label: 'Correo', value: profile?.correo ?? '-' },
              { label: 'Miembro desde', value: formatDate(profile?.fecha_registro) },
            ].map((item, i) => (
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                key={item.label}
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <span className="font-display text-xs font-bold uppercase tracking-wider text-white/40">{item.label}</span>
                <span className="truncate text-sm font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5">
          {message && <Notice tone="success">{message}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
        </div>

        <div className="mt-2 px-5">
          <div className="flex flex-col gap-2">
            {menu.map((item) => (
              <div key={item.label}>
                <button className="pb-soft flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]" onClick={item.action} type="button">
                  <Icon className="w-7 text-xl" name={item.icon} />
                  <span className="flex-1 text-sm font-semibold text-white">{item.label}</span>
                  <span className={`transition-transform ${item.open ? 'rotate-90' : ''}`}>
                    <ChevronRight size={14} />
                  </span>
                </button>

                {item.open && panel === 'data' && (
                  <form className="pb-card mt-2 flex flex-col gap-4 rounded-2xl p-4" onSubmit={saveData}>
                    <InputField label="Nombre" onChange={(e) => setNombre(e.target.value)} value={nombre} />
                    <InputField label="Correo" onChange={(e) => setCorreo(e.target.value)} type="email" value={correo} />
                    <GlowButton className="w-full tracking-widest" small tone="green" type="submit">
                      GUARDAR DATOS
                    </GlowButton>
                  </form>
                )}

                {item.open && panel === 'password' && (
                  <form className="pb-card mt-2 flex flex-col gap-4 rounded-2xl p-4" noValidate onSubmit={savePassword}>
                    <InputField autoComplete="current-password" label="Contraseña actual" onChange={(e) => setPasswordActual(e.target.value)} type="password" value={passwordActual} />
                    <InputField
                      autoComplete="new-password"
                      error={passwordError}
                      hint={<PasswordRequirements value={password} />}
                      id="profile-password"
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
                    <InputField
                      autoComplete="new-password"
                      label="Confirmar contraseña"
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      type="password"
                      value={passwordConfirmation}
                    />
                    <GlowButton className="w-full tracking-widest" small tone="green" type="submit">
                      CAMBIAR CONTRASEÑA
                    </GlowButton>
                  </form>
                )}
              </div>
            ))}

            <button
              className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              onClick={() => {
                clearSession()
                navigate('/welcome', { replace: true })
              }}
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
              type="button"
            >
              <Icon className="w-7 text-xl" name="logout" />
              <span className="flex-1 text-sm font-bold text-red-400">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </Page>
  )
}
