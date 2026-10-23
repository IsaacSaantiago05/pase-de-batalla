import { createApiClient } from '@shared/api'
import { getSession } from './auth'

export { listData } from '@shared/api'
export type { ApiEnvelope } from '@shared/api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const { apiGet, apiPost, apiPut, apiPatch } = createApiClient(API_URL, () => getSession()?.token)
