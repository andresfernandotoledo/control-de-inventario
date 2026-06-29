import React, { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { apiFetch } from '../api'
import { useToast } from './Toast'
import ConfirmModal from './ConfirmModal'
import { exportPdf } from '../exportPdf'
import type { Proyecto, Herramienta, StatsProy } from '../types'

Chart.register(...registerables)

const PAGE_SIZE = 15

export default function ProyectosSection() {
  const { toast } = useToast()
  const [proyectosData, setProyectosData] = useState<Proyecto[]>([])
  const [herrData, setHerrData] = useState<Herramienta[]>([])
  const [stats, setStats] = useState<StatsProy | null>(null)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [formData, setFormData] = useState({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin: '', responsable: '' })
  const [selectedTools, setSelectedTools] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [responsableInput, setResponsableInput] = useState({ open: false, id: 0, value: '' })
  const [showAdminPass, setShowAdminPass] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const adminPassResolve = useRef<((v: boolean) => void) | null>(null)
  const adminInputRef = useRef<HTMLInputElement>(null)

  const chartRefs = useRef<Record<string, Chart | null>>({})

  const fetchStats = async () => {
    const d = await apiFetch<StatsProy>('/stats/proyectos')
    if (d) setStats(d)
  }

  useEffect(() => {
    apiFetch<Proyecto[]>('/proyectos').then(d => d && setProyectosData(d))
    apiFetch<Herramienta[]>('/herramientas').then(d => d && setHerrData(d))
    fetchStats()
  }, [])

  useEffect(() => {
    if (!stats) return
    const charts = chartRefs.current
    Object.values(charts).forEach(c => c?.destroy())

    const estadoCanvas = document.getElementById('chart-proy-estados') as HTMLCanvasElement
    if (estadoCanvas) {
      const abiertos = stats.abiertos
      const cerrados = stats.cerrados
      charts['estados'] = new Chart(estadoCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Abiertos', 'Cerrados'],
          datasets: [{ data: [abiertos, cerrados], backgroundColor: ['#22c55e', '#ef4444'] }],
        },
      })
    }

    const herrCanvas = document.getElementById('chart-proy-herr') as HTMLCanvasElement
    if (herrCanvas && stats.herramientas_por_proy.length) {
      charts['herr'] = new Chart(herrCanvas, {
        type: 'bar',
        data: {
          labels: stats.herramientas_por_proy.map(e => e.proyecto),
          datasets: [{ label: 'Herramientas', data: stats.herramientas_por_proy.map(e => e.count), backgroundColor: '#f59e0b' }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      })
    }

    const mesCanvas = document.getElementById('chart-proy-mes') as HTMLCanvasElement
    if (mesCanvas && stats.proyectos_mes.length) {
      charts['mes'] = new Chart(mesCanvas, {
        type: 'line',
        data: {
          labels: stats.proyectos_mes.map(e => e.mes),
          datasets: [{ label: 'Proyectos', data: stats.proyectos_mes.map(e => e.count), borderColor: '#3b82f6', fill: false }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      })
    }

    const respCanvas = document.getElementById('chart-proy-responsables') as HTMLCanvasElement
    if (respCanvas && stats.responsables.length) {
      charts['responsables'] = new Chart(respCanvas, {
        type: 'bar',
        data: {
          labels: stats.responsables.map(e => e.responsable),
          datasets: [{ label: 'Responsables', data: stats.responsables.map(e => e.count), backgroundColor: '#22c55e' }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      })
    }

    return () => { Object.values(charts).forEach(c => c?.destroy()) }
  }, [stats])

  useEffect(() => {
    if (showAdminPass) {
      setTimeout(() => adminInputRef.current?.focus(), 50)
    }
  }, [showAdminPass])

  useEffect(() => {
    const total = Math.ceil(proyectosData.length / PAGE_SIZE)
    if (page >= total && total > 0) {
      setPage(0)
    }
  }, [proyectosData, page])

  function handleEdit(proy: Proyecto) {
    setEditando(proy)
    setFormData({
      nombre: proy.nombre,
      ubicacion: proy.ubicacion,
      descripcion: proy.descripcion,
      fecha_inicio: proy.fecha_inicio || '',
      fecha_fin: proy.fecha_fin || '',
      responsable: proy.responsable,
    })
    setSelectedTools([])
    setFormOpen(true)
  }

  function handleNew() {
    setEditando(null)
    setFormData({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin: '', responsable: '' })
    setSelectedTools([])
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body = { ...formData, herramientas: selectedTools }
      if (editando) {
        const res = await apiFetch<Proyecto>(`/proyectos/${editando.id}`, { method: 'PUT', body: JSON.stringify(body) })
        if (res) {
          toast('Proyecto actualizado', 'success')
          setProyectosData(prev => prev.map(p => p.id === editando.id ? res : p))
          setFormOpen(false)
          fetchStats()
        }
      } else {
        const res = await apiFetch<Proyecto>('/proyectos', { method: 'POST', body: JSON.stringify(body) })
        if (res) {
          toast('Proyecto creado', 'success')
          setProyectosData(prev => [...prev, res])
          setFormOpen(false)
          fetchStats()
        }
      }
    } catch (e: any) {
      toast(e.message || 'Error al guardar', 'error')
    }
  }

  async function handleEliminar(id: number) {
    if (!await confirmarAdmin()) return
    try {
      const res = await apiFetch(`/proyectos/${id}`, { method: 'DELETE' })
      if (res !== undefined || res === null) {
        toast('Proyecto eliminado', 'success')
        setProyectosData(prev => prev.filter(p => p.id !== id))
        fetchStats()
      }
    } catch (e: any) {
      toast(e.message || 'Error al eliminar', 'error')
    }
  }

  async function handleCerrar(id: number) {
    if (!await confirmarAdmin()) return
    try {
      const res = await apiFetch<Proyecto>(`/proyectos/${id}/cerrar`, { method: 'PUT' })
      if (res) {
        toast('Proyecto cerrado', 'success')
        setProyectosData(prev => prev.map(p => p.id === id ? res : p))
        fetchStats()
      }
    } catch (e: any) {
      toast(e.message || 'Error al cerrar', 'error')
    }
  }

  async function handleCambiarResponsable(id: number) {
    const proy = proyectosData.find(p => p.id === id)
    setResponsableInput({ open: true, id, value: proy?.responsable || '' })
  }

  const handleConfirmResponsable = async () => {
    const { id, value } = responsableInput
    setResponsableInput(p => ({ ...p, open: false }))
    if (!value.trim()) return
    try {
      const res = await apiFetch<Proyecto>(`/proyectos/${id}/responsable`, {
        method: 'PUT',
        body: JSON.stringify({ responsable: value.trim() }),
      })
      if (res) {
        toast('Responsable actualizado', 'success')
        setProyectosData(prev => prev.map(p => p.id === id ? res : p))
      }
    } catch (e: any) {
      toast(e.message || 'Error al actualizar responsable', 'error')
    }
  }

  const confirmarAdmin = (): Promise<boolean> => {
    return new Promise(resolve => {
      adminPassResolve.current = resolve
      setAdminPass('')
      setAdminError('')
      setShowAdminPass(true)
    })
  }

  const handleAdminConfirm = async () => {
    try {
      const res = await apiFetch<{ ok: boolean }>('/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password: adminPass }),
      })
      if (res?.ok) {
        adminPassResolve.current?.(true)
        adminPassResolve.current = null
        setShowAdminPass(false)
      } else {
        setAdminError('Contraseña incorrecta')
      }
    } catch {
      setAdminError('Error al verificar')
    }
  }

  const handleAdminCancel = () => {
    adminPassResolve.current?.(false)
    adminPassResolve.current = null
    setShowAdminPass(false)
  }

  const filtered = proyectosData.filter(p => {
    if (estadoFilter && p.estado !== estadoFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) &&
          !p.ubicacion.toLowerCase().includes(q) &&
          !(p.responsable || '').toLowerCase().includes(q) &&
          !(p.descripcion || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  useEffect(() => { setPage(0) }, [search, estadoFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  async function handleSelectAll() {
    setSelectedTools(herrData.map(h => h.id))
  }

  const handleExportPDF = () => {
    const headers = ['Nombre', 'Ubicación', 'Fecha Inicio', 'Fecha Fin', 'Responsable', 'Descripción', 'Estado']
    const rows = filtered.map(p => [p.nombre, p.ubicacion, p.fecha_inicio || '—', p.fecha_fin || '—', p.responsable, p.descripcion, p.estado])
    exportPdf('Listado de Proyectos', headers, rows, 'proyectos')
  }

  const proyectosMap = new Map(proyectosData.map(p => [p.id, p.nombre]))

  function toolInProyecto(herr: Herramienta): string | null {
    for (const proy of proyectosData) {
      if (proy.herramientas_asignadas?.split('||').some(entry => entry.startsWith(String(herr.id) + '::'))) return proy.nombre
    }
    return null
  }

  return (
    <div>
      {showAdminPass && (
        <div className="modal-overlay" onClick={handleAdminCancel}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header"><h3>Verificar Contraseña</h3></div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Ingrese su contraseña de administrador</p>
              <input ref={adminInputRef} type="password" className="input" placeholder="Contraseña" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdminConfirm(); if (e.key === 'Escape') handleAdminCancel() }} autoFocus />
              {adminError && <p style={{ color: '#ef4444', marginTop: 8 }}>{adminError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleAdminCancel}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdminConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h2>Proyectos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={handleExportPDF}>Exportar PDF</button>
          <button className="btn btn-primary" onClick={handleNew}>Nuevo Proyecto</button>
        </div>
      </div>

      {stats && (
        <div className="charts-grid">
          <div className="card">
            <div className="card-header"><h3>Estado</h3></div>
            <div className="card-body">
              <div className="chart-container"><canvas id="chart-proy-estados" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Herramientas por Proyecto</h3></div>
            <div className="card-body">
              <div className="chart-container"><canvas id="chart-proy-herr" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Proyectos por Mes</h3></div>
            <div className="card-body">
              <div className="chart-container"><canvas id="chart-proy-mes" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Top Responsables</h3></div>
            <div className="card-body">
              <div className="chart-container"><canvas id="chart-proy-responsables" /></div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <input className="input" placeholder="Buscar por nombre, ubicación, responsable..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="abierto">Abiertos</option>
              <option value="cerrado">Cerrados</option>
            </select>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ubicación</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                  <th>Responsable</th>
                  <th>Descripción</th>
                  <th>Herramientas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No se encontraron proyectos.</td></tr>
                ) : paginated.map(p => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{p.ubicacion}</td>
                    <td>{p.fecha_inicio || '—'}</td>
                    <td>{p.fecha_fin || '—'}</td>
                    <td>
                      {p.responsable}
                      <button className="btn btn-sm btn-ghost" onClick={() => handleCambiarResponsable(p.id)} title="Cambiar responsable">✎</button>
                    </td>
                    <td>{p.descripcion}</td>
                    <td>
                      {p.herramientas_asignadas ? (
                        <div className="badge-group">
                          {p.herramientas_asignadas.split(',').map((h, i) => (
                            <span key={i} className="badge badge-info">{h.trim()}</span>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td><span className={`badge ${p.estado === 'abierto' ? 'badge-success' : 'badge-error'}`}>{p.estado}</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm" onClick={() => handleEdit(p)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(p.id)}>Eliminar</button>
                        {p.estado === 'abierto' && (
                          <button className="btn btn-sm btn-warning" onClick={() => handleCerrar(p.id)}>Cerrar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <span>Página {page + 1} de {totalPages}</span>
              <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setFormOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input value={formData.nombre} onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Ubicación</label>
                    <input value={formData.ubicacion} onChange={e => setFormData(p => ({ ...p, ubicacion: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Fecha Inicio</label>
                    <input type="date" value={formData.fecha_inicio} onChange={e => setFormData(p => ({ ...p, fecha_inicio: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Fecha Fin</label>
                    <input type="date" value={formData.fecha_fin} onChange={e => setFormData(p => ({ ...p, fecha_fin: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Responsable</label>
                    <input value={formData.responsable} onChange={e => setFormData(p => ({ ...p, responsable: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea rows={3} value={formData.descripcion} onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Herramientas</label>
                  <div style={{ marginBottom: 8 }}>
                    <button type="button" className="btn btn-sm" onClick={handleSelectAll}>Seleccionar Todos</button>
                    <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setSelectedTools([])}>Deseleccionar Todos</button>
                  </div>
                  <div className="checkbox-grid">
                    {herrData.map(h => {
                      const inProy = toolInProyecto(h)
                      const checked = selectedTools.includes(h.id)
                      return (
                        <label key={h.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setSelectedTools(prev => checked ? prev.filter(id => id !== h.id) : [...prev, h.id])}
                          />
                          <span>{h.nombre} ({h.codigo})</span>
                          {inProy && <span className="warning-text"> se moverá desde: {inProy}</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setFormOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={responsableInput.open}
        title="Cambiar Responsable"
        message="Ingrese el nuevo responsable del proyecto"
        confirmLabel="Guardar"
        variant="primary"
        input
        inputLabel="Responsable"
        inputValue={responsableInput.value}
        onInputChange={v => setResponsableInput(p => ({ ...p, value: v }))}
        onConfirm={handleConfirmResponsable}
        onCancel={() => setResponsableInput(p => ({ ...p, open: false }))}
      />
    </div>
  )
}
