import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
}

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  created_at?: string
}

export default function PerfilModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.rol === 'admin'
  const [tab, setTab] = useState<'perfil' | 'usuarios'>('perfil')

  /* perfil */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  /* usuarios */
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'usuario' })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (open && isAdmin && tab === 'usuarios') loadUsuarios()
  }, [open, tab])

    async function loadUsuarios() {
    try { setUsuarios(await apiFetch('/usuarios') || []) }
    catch { toast('Error al cargar usuarios', 'error') }
  }

  /* perfil */
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

  /* usuarios */
  function resetForm() { setShowForm(false); setEditId(null); setForm({ nombre: '', email: '', password: '', rol: 'usuario' }); setFormError('') }

  async function handleSaveUser() {
    setFormError('')
    if (!form.nombre || !form.email) { setFormError('Nombre y email requeridos'); return }
    if (!editId && !form.password) { setFormError('Contraseña requerida'); return }
    try {
      if (editId) {
        const body: any = { nombre: form.nombre, email: form.email, rol: form.rol }
        if (form.password) body.password = form.password
        await apiFetch(`/usuarios/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast('Usuario actualizado', 'success')
      } else {
        await apiFetch('/usuarios', {
          method: 'POST',
          body: JSON.stringify({ nombre: form.nombre, email: form.email, password: form.password, rol: form.rol }),
        })
        toast('Usuario creado', 'success')
      }
      resetForm()
      loadUsuarios()
    } catch (e: any) { setFormError(e.message || 'Error') }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar usuario "${nombre}"?`)) return
    try {
      await apiFetch(`/usuarios/${id}`, { method: 'DELETE' })
      toast('Usuario eliminado', 'success')
      loadUsuarios()
    } catch (e: any) { toast(e.message || 'Error al eliminar', 'error') }
  }

  function editUser(u: Usuario) {
    setEditId(u.id)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol })
    setShowForm(true)
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: isAdmin ? 600 : 400 }}>
        <div className="modal-header">
          <h3>{tab === 'perfil' ? 'Perfil' : 'Usuarios'}</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {isAdmin && (
              <button className="btn btn-sm" style={{ background: tab === 'usuarios' ? 'var(--primary)' : 'var(--surface)', color: tab === 'usuarios' ? '#fff' : 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setTab('usuarios')}>👥 Usuarios</button>
            )}
            <button className="btn btn-sm" style={{ background: tab === 'perfil' ? 'var(--primary)' : 'var(--surface)', color: tab === 'perfil' ? '#fff' : 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setTab('perfil')}>👤 Perfil</button>
            <button className="btn-close" onClick={onClose}>×</button>
          </div>
        </div>

        {tab === 'perfil' && (
          <>
            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input className="input" value={user?.email || ''} disabled />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <input className="input" value={user?.rol || ''} disabled />
              </div>
              {isAdmin && (
                <>
                  <hr style={{ margin: '16px 0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary" disabled={backingUp} onClick={async () => {
                      setBackingUp(true)
                      try {
                        const r = await apiFetch<{ path: string }>('/backup/run', { method: 'POST' })
                        toast(`Backup creado: ${r?.path?.split('/').pop()}`, 'success')
                      } catch (e: any) { toast(e.message || 'Error', 'error') }
                      finally { setBackingUp(false) }
                    }}>{backingUp ? 'Respaldando...' : '📦 Hacer Backup'}</button>
                  </div>
                </>
              )}
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
          </>
        )}

        {tab === 'usuarios' && (
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>+ Nuevo</button>
            </div>

            {showForm && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12 }}>{editId ? 'Editar Usuario' : 'Nuevo Usuario'}</h4>
                <div className="form-group">
                  <label>Nombre</label>
                  <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contraseña {editId && <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(dejar vacío para no cambiar)</span>}</label>
                  <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={editId ? 0 : 6} />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select className="input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="usuario">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{formError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={resetForm}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveUser}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
              </div>
            )}

            <table className="table">
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th style={{ width: 100 }}>Acción</th></tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.nombre} {u.id === 1 && <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>(principal)</span>}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.rol === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>{u.rol}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => editUser(u)} disabled={u.id === 1}>✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id, u.nombre)} disabled={u.id === 1} style={{ marginLeft: 4 }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
