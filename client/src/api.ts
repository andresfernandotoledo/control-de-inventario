const API = '/api'
let token: string | null = localStorage.getItem('token')

export function setToken(t: string | null): void {
  token = t
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function getToken(): string | null {
  return token
}

export function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  })
  if (res.status === 401) {
    setToken(null)
    window.location.reload()
    return null
  }
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Error en la solicitud')
  return data as T
}
