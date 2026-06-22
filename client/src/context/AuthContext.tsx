import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiFetch, setToken as setApiToken, getToken } from '../api'
import type { Usuario } from '../types'

interface AuthContextType {
  user: Usuario | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [token, setTokenState] = useState<string | null>(getToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    if (t) {
      apiFetch<Usuario>('/auth/me')
        .then(data => {
          if (data) {
            setUser(data)
            setTokenState(t)
          }
        })
        .catch(() => {
          setApiToken(null)
          setTokenState(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!data) throw new Error('Error al iniciar sesión')
    setApiToken(data.token)
    setTokenState(data.token)
    setUser(data.usuario)
  }, [])

  const logout = useCallback(() => {
    setApiToken(null)
    setTokenState(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
