import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Chart } from 'chart.js/auto'
import { apiFetch } from '../api'
import { useToast } from './Toast'
import FotoModal from './FotoModal'
import ConfirmModal from './ConfirmModal'
import { exportPdf } from '../exportPdf'
import type { Herramienta, Proyecto, StatsHerr, HerrEstado } from '../types'
import { PAGE_SIZE, estadoColorsHerr, estadoLabelsHerr } from '../types'

export default function HerramientasSection() {
  const [herrData, setHerrData] = useState<Herramienta[]>([])
  const [proyectosData, setProyectosData] = useState<Proyecto[]>([])
  const [stats, setStats] = useState<StatsHerr | null>(null)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [proyectoFilter, setProyectoFilter] = useState('')
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', marca: '', modelo: '', ubicacion: '', estado: 'disponible' as HerrEstado, fecha_adquisicion: '', notas: '', foto_url: '' })

  const [showAsignar, setShowAsignar] = useState(false)
  const [asignarHerrId, setAsignarHerrId] = useState<number | null>(null)
  const [asignarProyectoId, setAsignarProyectoId] = useState('')
  const [asignarRecibido, setAsignarRecibido] = useState('')
  const [asignarFecha, setAsignarFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [asignarNotas, setAsignarNotas] = useState('')
  const [asignando, setAsignando] = useState(false)

  const [showHistorial, setShowHistorial] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [historialHerr, setHistorialHerr] = useState<{ codigo: string; nombre: string } | null>(null)

  const [showAdminPass, setShowAdminPass] = useState(false)
  const adminPassResolve = useRef<((v: boolean) => void) | null>(null)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const adminInputRef = useRef<HTMLInputElement>(null)
  const [fotoPreview, setFotoPreview] = useState<{ url: string; label: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const chartRefs = useRef<Record<string, Chart>>({})
  const { toast } = useToast()

  const herramientaEnUso = useCallback((h: Herramienta): boolean => {
    return proyectosData.some(p => {
      if (!p.herramientas_asignadas) return false
      return p.herramientas_asignadas.split('||').some(entry => {
        const [id] = entry.split('::')
        return id === String(h.id)
      })
    })
  }, [proyectosData])

  const getEstado = useCallback((h: Herramienta): HerrEstado => {
    if (h.estado === 'baja') return 'baja'
    if (herramientaEnUso(h)) return 'en_uso'
    return 'disponible'
  }, [herramientaEnUso])

  const fetchData = useCallback(async () => {
    const [herr, s] = await Promise.all([
      apiFetch<Herramienta[]>('/herramientas'),
      apiFetch<StatsHerr>('/stats/herramientas'),
    ])
    if (herr) setHerrData(herr)
    if (s) setStats(s)
  }, [])

  const fetchProyectos = useCallback(async () => {
    const d = await apiFetch<Proyecto[]>('/proyectos')
    if (d) setProyectosData(d)
  }, [])

  useEffect(() => {
    fetchData()
    fetchProyectos()
  }, [fetchData, fetchProyectos])

  useEffect(() => {
    if (showAdminPass) {
      setTimeout(() => adminInputRef.current?.focus(), 50)
    }
  }, [showAdminPass])

  const filteredData = useMemo(() => {
    return herrData.filter(h => {
      const estado = getEstado(h)
      if (search) {
        const s = search.toLowerCase()
        if (!h.codigo.toLowerCase().includes(s) && !h.nombre.toLowerCase().includes(s) && !h.ubicacion.toLowerCase().includes(s)) return false
      }
      if (estadoFilter && estado !== estadoFilter) return false
      if (proyectoFilter) {
        const pid = Number(proyectoFilter)
        const proy = proyectosData.find(p => p.id === pid)
        if (!proy?.herramientas_asignadas) return false
        return proy.herramientas_asignadas.split('||').some(entry => entry.startsWith(String(h.id) + '::'))
      }
      return true
    })
  }, [herrData, search, estadoFilter, proyectoFilter, getEstado, proyectosData])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
  const pagedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, estadoFilter, proyectoFilter])

  const disponibles = filteredData.filter(h => getEstado(h) === 'disponible').length
  const enUso = filteredData.filter(h => getEstado(h) === 'en_uso').length
  const deBaja = filteredData.filter(h => h.estado === 'baja').length

  useEffect(() => {
    Object.values(chartRefs.current).forEach(c => c.destroy())
    chartRefs.current = {}
    if (!stats) return
    const configs: Record<string, { type: string; data: any; options?: any }> = {
      'herr-estados': {
        type: 'doughnut',
        data: {
          labels: stats.estados.map(e => estadoLabelsHerr[e.estado] || e.estado),
          datasets: [{ data: stats.estados.map(e => e.count), backgroundColor: stats.estados.map(e => estadoColorsHerr[e.estado] || '#999') }],
        },
      },
      'herr-marcas': {
        type: 'bar',
        data: { labels: stats.marcas.map(e => e.marca), datasets: [{ label: 'Cantidad', data: stats.marcas.map(e => e.count), backgroundColor: '#8b5cf6' }] },
        options: { responsive: true, maintainAspectRatio: false },
      },
      'herr-adquisiciones': {
        type: 'line',
        data: { labels: stats.adquisiciones_por_mes.map(e => e.mes), datasets: [{ label: 'Adquisiciones', data: stats.adquisiciones_por_mes.map(e => e.count), borderColor: '#22c55e', fill: false }] },
        options: { responsive: true, maintainAspectRatio: false },
      },
      'herr-ubicaciones': {
        type: 'bar',
        data: { labels: stats.ubicaciones.map(e => e.ubicacion), datasets: [{ label: 'Cantidad', data: stats.ubicaciones.map(e => e.count), backgroundColor: '#06b6d4' }] },
        options: { responsive: true, maintainAspectRatio: false },
      },
    }
    Object.entries(configs).forEach(([id, cfg]) => {
      const canvas = document.getElementById(`chart-${id}`) as HTMLCanvasElement | null
      if (canvas) {
        chartRefs.current[id] = new Chart(canvas, cfg as any)
      }
    })
    return () => { Object.values(chartRefs.current).forEach(c => c.destroy()) }
  }, [stats])

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
      if (res?.ok === true) {
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

  const openCreateForm = () => {
    setEditId(null)
    setForm({ codigo: '', nombre: '', marca: '', modelo: '', ubicacion: '', estado: 'disponible', fecha_adquisicion: '', notas: '', foto_url: '' })
    setShowForm(true)
  }

  const openEditForm = async (h: Herramienta) => {
    const ok = await confirmarAdmin()
    if (!ok) return
    setEditId(h.id)
    setForm({ codigo: h.codigo, nombre: h.nombre, marca: h.marca, modelo: h.modelo, ubicacion: h.ubicacion, estado: h.estado, fecha_adquisicion: h.fecha_adquisicion || '', notas: h.notas, foto_url: h.foto_url || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    const body = { ...form, fecha_adquisicion: form.fecha_adquisicion || null }
    try {
      if (editId) {
        await apiFetch(`/herramientas/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast('Herramienta actualizada', 'success')
      } else {
        await apiFetch('/herramientas', { method: 'POST', body: JSON.stringify(body) })
        toast('Herramienta creada', 'success')
      }
      setShowForm(false)
      fetchData()
    } catch (e: any) {
      toast(e.message || 'Error al guardar', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    const id = confirmDeleteId
    if (!id) return
    setConfirmDeleteId(null)
    const ok = await confirmarAdmin()
    if (!ok) return
    try {
      await apiFetch(`/herramientas/${id}`, { method: 'DELETE' })
      toast('Herramienta eliminada', 'success')
      fetchData()
    } catch (e: any) {
      toast(e.message || 'Error al eliminar', 'error')
    }
  }

  const openAsignar = (h: Herramienta) => {
    setAsignarHerrId(h.id)
    setAsignarProyectoId('')
    setAsignarRecibido('')
    setAsignarFecha(new Date().toISOString().slice(0, 10))
    setAsignarNotas('')
    setShowAsignar(true)
  }

  const handleAsignar = async () => {
    if (!asignarHerrId || !asignarProyectoId) { toast('Seleccione un proyecto', 'error'); return }
    setAsignando(true)
    try {
      await apiFetch('/movimientos/salida', {
        method: 'POST',
        body: JSON.stringify({ herramienta_id: asignarHerrId, proyecto_id: Number(asignarProyectoId), fecha_salida: asignarFecha, recibido_por: asignarRecibido, notas: asignarNotas }),
      })
      toast('Herramienta asignada', 'success')
      setShowAsignar(false)
      fetchData()
      fetchProyectos()
    } catch (e: any) {
      toast(e.message || 'Error al asignar', 'error')
    } finally {
      setAsignando(false)
    }
  }

  const openHistorial = async (h: Herramienta) => {
    setHistorialHerr({ codigo: h.codigo, nombre: h.nombre })
    setHistorial([])
    setShowHistorial(true)
    try {
      const data = await apiFetch<any[]>(`/herramientas/${h.id}/historial`)
      if (data) setHistorial(data)
    } catch { toast('Error al cargar historial', 'error') }
  }

  const handleExportExcel = () => {
    const labels = ['Código', 'Nombre', 'Marca', 'Modelo', 'Ubicación', 'Estado', 'Adquisición', 'Notas']
    const rows = filteredData.map(h => [h.codigo, h.nombre, h.marca, h.modelo, h.ubicacion, estadoLabelsHerr[getEstado(h)], h.fecha_adquisicion || '', h.notas])
    const csv = [labels, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'herramientas.csv'; a.click()
    URL.revokeObjectURL(url)
    toast('Exportado a CSV', 'success')
  }

  const handleExportPDF = () => {
    const headers = ['Código', 'Nombre', 'Marca', 'Modelo', 'Ubicación', 'Estado', 'Adquisición', 'Notas']
    const rows = filteredData.map(h => [h.codigo, h.nombre, h.marca, h.modelo, h.ubicacion, estadoLabelsHerr[getEstado(h)], h.fecha_adquisicion || '—', h.notas || '—'])
    exportPdf('Listado de Herramientas', headers, rows, 'herramientas')
  }

  return (
    <div>
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

      <div className="dash-cards" style={{ marginBottom: 16 }}>
        <div className="dash-card"><div className="dash-icon">✅</div><div><span className="dash-num">{disponibles}</span><span className="dash-label">Disponibles</span></div></div>
        <div className="dash-card"><div className="dash-icon">🔧</div><div><span className="dash-num">{enUso}</span><span className="dash-label">En Uso</span></div></div>
        <div className="dash-card"><div className="dash-icon">❌</div><div><span className="dash-num">{deBaja}</span><span className="dash-label">De Baja</span></div></div>
      </div>

      {stats && (
        <div className="charts-grid" style={{ marginBottom: 16 }}>
          <div className="card"><div className="card-header"><h3>Estados</h3></div><div className="card-body"><div className="chart-container"><canvas id="chart-herr-estados" /></div></div></div>
          <div className="card"><div className="card-header"><h3>Marcas</h3></div><div className="card-body"><div className="chart-container"><canvas id="chart-herr-marcas" /></div></div></div>
          <div className="card"><div className="card-header"><h3>Adquisiciones por Mes</h3></div><div className="card-body"><div className="chart-container"><canvas id="chart-herr-adquisiciones" /></div></div></div>
          <div className="card"><div className="card-header"><h3>Ubicaciones</h3></div><div className="card-body"><div className="chart-container"><canvas id="chart-herr-ubicaciones" /></div></div></div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Herramientas ({filteredData.length})</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" style={{ width: 200 }} placeholder="Buscar código, nombre, ubicación..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input" style={{ width: 140 }} value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="en_uso">En Uso</option>
              <option value="baja">Baja</option>
            </select>
            <select className="input" style={{ width: 180 }} value={proyectoFilter} onChange={e => setProyectoFilter(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {proyectosData.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <button className="btn btn-primary" onClick={openCreateForm}>+ Nueva</button>
            <button className="btn btn-secondary" onClick={handleExportExcel}>Excel</button>
            <button className="btn btn-secondary" onClick={handleExportPDF}>PDF</button>
          </div>
        </div>
        <div className="card-body">
          {pagedData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No hay herramientas registradas.</p>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Foto</th><th>Código</th><th>Nombre</th><th>Marca</th><th>Modelo</th><th>Ubicación</th><th>Estado</th><th>Adquisición</th><th>Notas</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedData.map(h => {
                      const est = getEstado(h)
                      return (
                        <tr key={h.id}>
                          <td>{h.foto_url ? <img src={h.foto_url} alt="foto" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} onClick={() => setFotoPreview({ url: h.foto_url, label: `${h.codigo} - ${h.nombre}` })} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : '—'}</td>
                          <td>{h.codigo}</td>
                          <td>{h.nombre}</td>
                          <td>{h.marca}</td>
                          <td>{h.modelo}</td>
                          <td>{h.ubicacion}</td>
                          <td><span className="badge" style={{ backgroundColor: estadoColorsHerr[est] || '#999' }}>{estadoLabelsHerr[est] || est}</span></td>
                          <td>{h.fecha_adquisicion || '—'}</td>
                          <td>{h.notas || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm btn-primary" onClick={() => openEditForm(h)} title="Editar">✏️</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => openAsignar(h)} title="Asignar a proyecto">📋</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => openHistorial(h)} title="Historial">📜</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(h.id)} title="Eliminar">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
                  <span style={{ color: 'var(--text-secondary)' }}>Página {page} de {totalPages}</span>
                  <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{editId ? 'Editar Herramienta' : 'Nueva Herramienta'}</h3></div>
            <div className="modal-body">
              <div className="form-group"><label>Código</label><input className="input" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
              <div className="form-group"><label>Nombre</label><input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
              <div className="form-group"><label>Marca</label><input className="input" value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} /></div>
              <div className="form-group"><label>Modelo</label><input className="input" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} /></div>
              <div className="form-group"><label>Ubicación</label><input className="input" value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} /></div>
              <div className="form-group"><label>Estado</label><select className="input" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value as HerrEstado }))}><option value="disponible">Disponible</option><option value="en_uso">En Uso</option><option value="baja">Baja</option></select></div>
              <div className="form-group"><label>Fecha de Adquisición</label><input type="date" className="input" value={form.fecha_adquisicion} onChange={e => setForm(p => ({ ...p, fecha_adquisicion: e.target.value }))} /></div>
              <div className="form-group"><label>URL Foto</label><input className="input" value={form.foto_url} onChange={e => setForm(p => ({ ...p, foto_url: e.target.value }))} placeholder="https://..." /></div>
              <div className="form-group"><label>Notas</label><textarea className="input" rows={3} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showAsignar && (
        <div className="modal-overlay" onClick={() => setShowAsignar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header"><h3>Asignar Herramienta a Proyecto</h3></div>
            <div className="modal-body">
              <div className="form-group"><label>Proyecto</label><select className="input" value={asignarProyectoId} onChange={e => setAsignarProyectoId(e.target.value)}><option value="">Seleccionar...</option>{proyectosData.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
              <div className="form-group"><label>Fecha de Salida</label><input type="date" className="input" value={asignarFecha} onChange={e => setAsignarFecha(e.target.value)} /></div>
              <div className="form-group"><label>Recibido por</label><input className="input" value={asignarRecibido} onChange={e => setAsignarRecibido(e.target.value)} /></div>
              <div className="form-group"><label>Notas</label><textarea className="input" rows={2} value={asignarNotas} onChange={e => setAsignarNotas(e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAsignar(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={asignando} onClick={handleAsignar}>{asignando ? 'Asignando...' : 'Asignar'}</button>
            </div>
          </div>
        </div>
      )}

      {showHistorial && (
        <div className="modal-overlay" onClick={() => setShowHistorial(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Historial - {historialHerr?.codigo} {historialHerr?.nombre}</h3></div>
            <div className="modal-body">
              {historial.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Cargando historial...</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(historial[0]).map(k => <th key={k}>{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((r, i) => (
                        <tr key={i}>
                          {Object.values(r).map((v: any, j) => <td key={j}>{v !== null && v !== undefined ? String(v) : '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistorial(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {fotoPreview && <FotoModal url={fotoPreview.url} label={fotoPreview.label} onClose={() => setFotoPreview(null)} />}
      <ConfirmModal open={confirmDeleteId !== null} title="Eliminar Herramienta" message="¿Está seguro de eliminar esta herramienta?" confirmLabel="Eliminar" onConfirm={handleConfirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </div>
  )
}
