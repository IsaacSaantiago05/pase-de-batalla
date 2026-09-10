export type AdminSession = {
  token: string
  role: string
}

const KEY = 'pb_admin_session'

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function setAdminSession(session: AdminSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearAdminSession(): void {
  localStorage.removeItem(KEY)
}
