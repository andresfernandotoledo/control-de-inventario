import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

export default function Login() {
  const { login } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      toast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="view-login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="login-icon">📦</div>
          <h1>Control de Inventario</h1>
          <p>Ingrese sus credenciales</p>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="correo@ejemplo.com" />
        </div>
        <div className="form-group">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? <span className="loading-spinner" /> : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  )
}
