import { createSessionStore } from '@shared/session'
import type { StoredSession } from '@shared/session'

export type Session = StoredSession

const store = createSessionStore<Session>('pb_user_session')

export const getSession = store.get
export const setSession = store.set
export const clearSession = store.clear
