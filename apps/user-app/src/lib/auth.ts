export type Session = {
  token: string
  role: string
}

const KEY = 'pb_user_session'

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
