// Sesion guardada en localStorage. Cada app usa su propia clave, asi las sesiones no se mezclan.

export type StoredSession = {
  token: string
  role: string
}

export type SessionStore<T extends StoredSession> = {
  get(): T | null
  set(session: T): void
  clear(): void
}

export function createSessionStore<T extends StoredSession>(key: string): SessionStore<T> {
  return {
    get() {
      const raw = localStorage.getItem(key)
      if (!raw) return null

      try {
        return JSON.parse(raw) as T
      } catch {
        return null
      }
    },
    set(session) {
      localStorage.setItem(key, JSON.stringify(session))
    },
    clear() {
      localStorage.removeItem(key)
    },
  }
}
