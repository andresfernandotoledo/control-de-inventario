import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PerfilModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    setError('')
    if (!currentPassword || !newPassword) { setError('Ambos campos son requeridos'); return }
    if (newPassword.length < 6) { setError('Mínimo 6 caracteres'); return }
    setSaving(true)
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast('Contraseña actualizada', 'success')
      setCurrentPassword('')
      setNewPassword('')
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al cambiar contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>Perfil</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Email</label>
            <input className="input" value={user?.email || ''} disabled />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <input className="input" value={user?.rol || ''} disabled />
          </div>
          <hr style={{ margin: '16px 0' }} />
          <div className="form-group">
            <label>Contraseña actual</label>
            <input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div className="form-group">
            <label>Nueva contraseña (mín. 6)</label>
            <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" minLength={6} />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Cambiar Contraseña'}</button>
        </div>
      </div>
    </div>
  )
}
