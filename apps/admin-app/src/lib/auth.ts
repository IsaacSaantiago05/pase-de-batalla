import { createSessionStore } from '@shared/session'
import type { StoredSession } from '@shared/session'

export type AdminSession = StoredSession

const store = createSessionStore<AdminSession>('pb_admin_session')

export const getAdminSession = store.get
export const setAdminSession = store.set
export const clearAdminSession = store.clear
