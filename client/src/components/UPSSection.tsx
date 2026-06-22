import React, { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, getHeaders } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import type { UPS, UPSEstado, StatsUPS } from '../types'
import { estadoLabelsUPS, estadoColorsUPS, PAGE_SIZE } from '../types'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default function UPSSection() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [upsData, setUpsData] = useState<UPS[]>([])
  const [stats, setStats] = useState<StatsUPS | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUPS, setEditingUPS] = useState<UPS | null>(null)
  const [formData, setFormData] = useState({
    serial_number: '',
    modelo: '',
    capacidad: '',
    ubicacion: '',
    estado: 'activa' as UPSEstado,
    fecha_ingreso: '',
    fecha_salida: '',
    notas: '',
  })
  const chartRefs = useRef<Chart[]>([])
  const [showAdminPass, setShowAdminPass] = useState(false)
  const adminPassResolve = useRef<((v: boolean) => void) | null>(null)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const adminInputRef = useRef<HTMLInputElement>(null)

  const loadUPS = useCallback(async () => {
    const data = await apiFetch<UPS[]>('/ups')
    if (data) setUpsData(data)
  }, [])

  const loadStatsUPS = useCallback(async () => {
    const data = await apiFetch<StatsUPS>('/stats/ups')
    if (data) setStats(data)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadUPS(), loadStatsUPS()]).finally(() => setLoading(false))
  }, [loadUPS, loadStatsUPS])

  const filtered = upsData.filter(ups => {
    const q = search.toLowerCase()
    return (
      (!search || ups.serial_number.toLowerCase().includes(q) || ups.modelo.toLowerCase().includes(q) || ups.ubicacion.toLowerCase().includes(q)) &&
      (!filterEstado || ups.estado === filterEstado)
    )
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [search, filterEstado])

  const renderCharts = useCallback((s: StatsUPS) => {
    chartRefs.current.forEach(c => c.destroy())
    chartRefs.current = []

    const charts = [
      {
        id: 'chart-ups-estado',
        type: 'doughnut' as const,
        labels: s.estados.map(e => estadoLabelsUPS[e.estado] || e.estado),
        data: s.estados.map(e => e.count),
        colors: s.estados.map(e => estadoColorsUPS[e.estado] || '#ccc'),
      },
      {
        id: 'chart-ups-modelo',
        type: 'bar' as const,
        labels: s.modelos.map(e => e.modelo),
        data: s.modelos.map(e => e.count),
      },
      {
        id: 'chart-ups-meses',
        type: 'line' as const,
        labels: s.ingresos_por_mes.map(e => e.mes),
        data: s.ingresos_por_mes.map(e => e.count),
      },
      {
        id: 'chart-ups-ubicacion',
        type: 'bar' as const,
        labels: s.ubicaciones.map(e => e.ubicacion),
        data: s.ubicaciones.map(e => e.count),
      },
    ]

    charts.forEach(({ id, type, labels, data, colors }) => {
      const canvas = document.getElementById(id) as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dataset: Record<string, unknown> = { data }
      if (type === 'doughnut') {
        dataset.backgroundColor = colors
      } else if (type === 'line') {
        dataset.borderColor = '#3b82f6'
        dataset.fill = false
        dataset.label = 'Cantidad'
      } else {
        dataset.backgroundColor = '#3b82f6'
        dataset.label = 'Cantidad'
      }

      const config: Record<string, unknown> = {
        type,
        data: { labels, datasets: [dataset] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: type === 'doughnut' } },
        },
      }

      chartRefs.current.push(new Chart(canvas, config as any))
    })
  }, [])

  useEffect(() => {
    if (stats) {
      renderCharts(stats)
    }
    return () => {
      chartRefs.current.forEach(c => c.destroy())
      chartRefs.current = []
    }
  }, [stats, renderCharts])

  const confirmarAdmin = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      adminPassResolve.current = resolve
      setAdminPass('')
      setAdminError('')
      setShowAdminPass(true)
    })
  }, [])

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

  useEffect(() => {
    if (!showAdminPass) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleAdminCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAdminPass])

  const openFormUPS = useCallback(async (id?: number) => {
    if (id !== undefined) {
      const ok = await confirmarAdmin()
      if (!ok) return
      const ups = upsData.find(u => u.id === id)
      if (!ups) return
      setEditingUPS(ups)
      setFormData({
        serial_number: ups.serial_number,
        modelo: ups.modelo,
        capacidad: ups.capacidad,
        ubicacion: ups.ubicacion,
        estado: ups.estado,
        fecha_ingreso: ups.fecha_ingreso || '',
        fecha_salida: ups.fecha_salida || '',
        notas: ups.notas,
      })
    } else {
      setEditingUPS(null)
      setFormData({
        serial_number: '',
        modelo: '',
        capacidad: '',
        ubicacion: '',
        estado: 'activa',
        fecha_ingreso: '',
        fecha_salida: '',
        notas: '',
      })
    }
    setFormOpen(true)
  }, [upsData, toast, confirmarAdmin])

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async () => {
    const body = {
      ...formData,
      fecha_ingreso: formData.fecha_ingreso || null,
      fecha_salida: formData.fecha_salida || null,
    }
    try {
      if (editingUPS) {
        await apiFetch(`/ups/${editingUPS.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        toast('UPS actualizada correctamente', 'success')
      } else {
        await apiFetch('/ups', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        toast('UPS creada correctamente', 'success')
      }
      setFormOpen(false)
      setEditingUPS(null)
      await loadUPS()
      await loadStatsUPS()
    } catch (e: any) {
      toast(e.message || 'Error al guardar', 'error')
    }
  }

  const deleteUPS = useCallback(async (id: number) => {
    const ok = await confirmarAdmin()
    if (!ok) return
    if (!confirm('¿Está seguro de eliminar esta UPS?')) return

    try {
      await apiFetch(`/ups/${id}`, { method: 'DELETE' })
      toast('UPS eliminada correctamente', 'success')
      await loadUPS()
      await loadStatsUPS()
    } catch (e: any) {
      toast(e.message || 'Error al eliminar', 'error')
    }
  }, [loadUPS, loadStatsUPS, toast, confirmarAdmin])

  const handleEstadoChange = async (id: number, estado: UPSEstado) => {
    try {
      await apiFetch(`/ups/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      })
      toast('Estado actualizado', 'success')
      await loadUPS()
      await loadStatsUPS()
    } catch (e: any) {
      toast(e.message || 'Error al cambiar estado', 'error')
    }
  }

  const exportExcel = async () => {
    try {
      const res = await fetch('/api/export/ups', { headers: getHeaders() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ups-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Excel descargado', 'success');
    } catch (err) { toast((err as Error).message, 'error'); }
  }

  function escapeHtml(str: string | null | undefined): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const exportPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const rows = filtered.map(u => `
      <tr>
        <td>${escapeHtml(u.serial_number)}</td>
        <td>${escapeHtml(u.modelo)}</td>
        <td>${escapeHtml(u.capacidad)}</td>
        <td>${escapeHtml(u.ubicacion)}</td>
        <td>${escapeHtml(estadoLabelsUPS[u.estado])}</td>
        <td>${escapeHtml(u.fecha_ingreso) || '&mdash;'}</td>
        <td>${escapeHtml(u.fecha_salida) || '&mdash;'}</td>
        <td>${escapeHtml(u.notas) || '&mdash;'}</td>
      </tr>
    `).join('')
    w.document.write(`
      <html><head><title>UPS</title>
      <style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background: #eee; }</style>
      </head><body>
      <h2>Reporte de UPS</h2>
      <table>
        <thead><tr><th>Serie</th><th>Modelo</th><th>Capacidad</th><th>Ubicaci&oacute;n</th><th>Estado</th><th>Ingreso</th><th>Salida</th><th>Notas</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  if (loading) {
    return (
      <section>
        <div className="loading-spinner" style={{ width: 32, height: 32, margin: '2rem auto' }} />
      </section>
    )
  }

  const counts: Record<string, number> = {}
  upsData.forEach(u => {
    counts[u.estado] = (counts[u.estado] || 0) + 1
  })

  return (
    <section>
      {showAdminPass && (
        <div className="modal-overlay" onClick={handleAdminCancel}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Verificar Contraseña</h3></div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Ingrese su contraseña de administrador</p>
              <input ref={adminInputRef} type="password" className="input" placeholder="Contraseña" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdminConfirm() }} autoFocus />
              {adminError && <p style={{ color: '#ef4444', marginTop: 8 }}>{adminError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleAdminCancel}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdminConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="dash-cards">
        {(Object.entries(estadoLabelsUPS) as [UPSEstado, string][]).map(([key, label]) => (
          <div key={key} className="dash-card">
            <div className="dash-icon" style={{ color: estadoColorsUPS[key] }}>●</div>
            <div>
              <span className="dash-num">{counts[key] || 0}</span>
              <span className="dash-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => openFormUPS()}>+ Nueva UPS</button>
        <button className="btn" onClick={exportExcel}>Exportar Excel</button>
        <button className="btn" onClick={exportPDF}>Exportar PDF</button>
      </div>

      {stats && (
        <div className="charts-grid">
          <div className="card"><div className="card-header"><h3>Distribución por Estado</h3></div><div className="card-body chart-container"><canvas id="chart-ups-estado"></canvas></div></div>
          <div className="card"><div className="card-header"><h3>Por Modelo</h3></div><div className="card-body chart-container"><canvas id="chart-ups-modelo"></canvas></div></div>
          <div className="card"><div className="card-header"><h3>Ingresos por Mes</h3></div><div className="card-body chart-container"><canvas id="chart-ups-meses"></canvas></div></div>
          <div className="card"><div className="card-header"><h3>Top Ubicaciones</h3></div><div className="card-body chart-container"><canvas id="chart-ups-ubicacion"></canvas></div></div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Buscar por serie, modelo o ubicación..."
              className="form-input"
              style={{ flex: 1, minWidth: 200 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-input"
              style={{ width: 200 }}
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {(Object.entries(estadoLabelsUPS) as [UPSEstado, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {paginated.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Serie</th>
                    <th>Modelo</th>
                    <th>Capacidad</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Ingreso</th>
                    <th>Salida</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(ups => (
                    <tr key={ups.id}>
                      <td>{ups.serial_number}</td>
                      <td>{ups.modelo}</td>
                      <td>{ups.capacidad}</td>
                      <td>{ups.ubicacion}</td>
                      <td>
                        <select
                          value={ups.estado}
                          onChange={e => handleEstadoChange(ups.id, e.target.value as UPSEstado)}
                          style={{ color: estadoColorsUPS[ups.estado], fontWeight: 600 }}
                          className="form-input"
                        >
                          {(Object.entries(estadoLabelsUPS) as [UPSEstado, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td>{ups.fecha_ingreso || '—'}</td>
                      <td>{ups.fecha_salida || '—'}</td>
                      <td>{ups.notas || '—'}</td>
                      <td>
                        <button className="btn btn-xs" onClick={() => openFormUPS(ups.id)}>Editar</button>
                        <button className="btn btn-xs btn-danger" onClick={() => deleteUPS(ups.id)} style={{ marginLeft: 4 }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              No se encontraron UPS.
            </p>
          )}

          <div className="pag-controls" style={{ display: filtered.length > PAGE_SIZE ? 'flex' : 'none' }}>
            <button className="btn btn-xs" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹ Anterior</button>
            <span>Pág {page + 1} de {totalPages}</span>
            <button className="btn btn-xs" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Siguiente ›</button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUPS ? 'Editar UPS' : 'Nueva UPS'}</h3>
              <button className="btn-close" onClick={() => setFormOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Serial / N° Serie</label>
                <input className="form-input" value={formData.serial_number} onChange={e => handleFormChange('serial_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input className="form-input" value={formData.modelo} onChange={e => handleFormChange('modelo', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Capacidad</label>
                <input className="form-input" value={formData.capacidad} onChange={e => handleFormChange('capacidad', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Ubicación</label>
                <input className="form-input" value={formData.ubicacion} onChange={e => handleFormChange('ubicacion', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select className="form-input" value={formData.estado} onChange={e => handleFormChange('estado', e.target.value)}>
                  {(Object.entries(estadoLabelsUPS) as [UPSEstado, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de Ingreso</label>
                <input type="date" className="form-input" value={formData.fecha_ingreso} onChange={e => handleFormChange('fecha_ingreso', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Fecha de Salida</label>
                <input type="date" className="form-input" value={formData.fecha_salida} onChange={e => handleFormChange('fecha_salida', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea className="form-input" rows={3} value={formData.notas} onChange={e => handleFormChange('notas', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={handleFormSubmit}>{editingUPS ? 'Guardar Cambios' : 'Crear UPS'}</button>
              <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
