import { getAdminSession } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const session = getAdminSession()

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok) {
    throw new Error(body.message ?? 'Error de servidor')
  }

  return body
}

export function apiPost<T>(path: string, payload: unknown): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  return request<T>(path, { method: 'GET' })
}
