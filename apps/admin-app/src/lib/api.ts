import { createApiClient } from '@shared/api'
import { getAdminSession } from './auth'

export { listData } from '@shared/api'
export type { ApiEnvelope } from '@shared/api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } = createApiClient(API_URL, () => getAdminSession()?.token)
