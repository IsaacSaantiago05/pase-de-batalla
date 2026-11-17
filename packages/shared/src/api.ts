// Cliente HTTP comun para user-app y admin-app. Cada app lo crea con su URL y su fuente de token.

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

// Error de la API. En validaciones (422) trae el primer mensaje de cada campo en `fields`.
export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = Object.fromEntries(Object.entries(errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']))
  }
}

export type ApiClient = {
  apiGet<T>(path: string): Promise<ApiEnvelope<T>>
  apiPost<T>(path: string, payload: unknown): Promise<ApiEnvelope<T>>
  apiPut<T>(path: string, payload: unknown): Promise<ApiEnvelope<T>>
  apiPatch<T>(path: string, payload: unknown): Promise<ApiEnvelope<T>>
}

export function createApiClient(baseUrl: string, getToken: () => string | null | undefined): ApiClient {
  async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
    const token = getToken()

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    })

    // Una respuesta que no es JSON (por ejemplo, un error 500 en HTML) no debe romper la pantalla.
    let body: ApiEnvelope<T> | null = null
    try {
      body = (await response.json()) as ApiEnvelope<T>
    } catch {
      body = null
    }

    if (!response.ok || body === null) {
      const errors = (body as { errors?: Record<string, string[]> } | null)?.errors
      throw new ApiError(body?.message ?? `Error de servidor (${response.status})`, response.status, errors)
    }

    return body
  }

  const withBody = (method: string) => <T>(path: string, payload: unknown) =>
    request<T>(path, { method, body: JSON.stringify(payload) })

  return {
    apiGet: <T>(path: string) => request<T>(path, { method: 'GET' }),
    apiPost: withBody('POST'),
    apiPut: withBody('PUT'),
    apiPatch: withBody('PATCH'),
  }
}

// Los listados de la API llegan en `data` como arreglo; se acepta tambien { data: [...] } por compatibilidad.
export function listData<T>(payload: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  return payload?.data ?? []
}
