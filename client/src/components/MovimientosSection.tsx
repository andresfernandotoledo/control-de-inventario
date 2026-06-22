import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import type { Movimiento, Proyecto } from '../types'

export default function MovimientosSection() {
  const [movimientosData, setMovimientosData] = useState<Movimiento[]>([])
  const [reporteData, setReporteData] = useState<Movimiento[]>([])
  const [proyectosData, setProyectosData] = useState<Proyecto[]>([])
  const [filtroProyecto, setFiltroProyecto] = useState('')
  const [reporteOpen, setReporteOpen] = useState(false)

  useEffect(() => {
    apiFetch<Movimiento[]>('/movimientos').then(d => d && setMovimientosData(d))
    apiFetch<Proyecto[]>('/proyectos').then(d => d && setProyectosData(d))
  }, [])

  const enUso = movimientosData.filter(m => !m.fecha_entrada).length
  const proyectosActivos = new Set(movimientosData.filter(m => !m.fecha_entrada).map(m => m.proyecto_nombre)).size
  const total = movimientosData.length

  const filtrados = filtroProyecto
    ? movimientosData.filter(m => m.proyecto_nombre === filtroProyecto)
    : movimientosData

  async function handleReporteFisico() {
    const data = await apiFetch<Movimiento[]>('/reporte/movimientos')
    if (data) setReporteData(data)
    setReporteOpen(true)
  }

  return (
    <div>
      <div className="section-header">
        <h2>Movimientos</h2>
        <button className="btn btn-primary" onClick={handleReporteFisico}>Reporte Físico</button>
      </div>

      <div className="dash-cards">
        <div className="dash-card">
          <div className="dash-icon">🔧</div>
          <div>
            <span className="dash-num">{enUso}</span>
            <span className="dash-label">En Uso (sin fecha entrada)</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-icon">📋</div>
          <div>
            <span className="dash-num">{proyectosActivos}</span>
            <span className="dash-label">Proyectos Activos</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-icon">🔄</div>
          <div>
            <span className="dash-num">{total}</span>
            <span className="dash-label">Total Movimientos</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>Filtrar por proyecto:</label>
            <select value={filtroProyecto} onChange={e => setFiltroProyecto(e.target.value)} style={{ flex: 1, maxWidth: 300 }}>
              <option value="">Todos</option>
              {proyectosData.map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha Salida</th>
                  <th>Herramienta</th>
                  <th>Proyecto</th>
                  <th>Recibió</th>
                  <th>Estado</th>
                  <th>Fecha Entrada</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(m => (
                  <tr key={m.id}>
                    <td>{m.fecha_salida}</td>
                    <td>{m.herramienta_codigo} - {m.herramienta_nombre}</td>
                    <td>{m.proyecto_nombre}</td>
                    <td>{m.recibido_por}</td>
                    <td>
                      <span className={`badge ${m.fecha_entrada ? 'badge-success' : 'badge-warning'}`}>
                        {m.fecha_entrada ? 'Devuelta' : 'En uso'}
                      </span>
                    </td>
                    <td>{m.fecha_entrada || '—'}</td>
                    <td>{m.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {reporteOpen && (
        <div className="modal-overlay" onClick={() => setReporteOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reporte Físico de Movimientos</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setReporteOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha Salida</th>
                      <th>Herramienta</th>
                      <th>Proyecto</th>
                      <th>Recibió</th>
                      <th>Estado</th>
                      <th>Fecha Entrada</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteData.map(m => (
                      <tr key={m.id}>
                        <td>{m.fecha_salida}</td>
                        <td>{m.herramienta_codigo} - {m.herramienta_nombre}</td>
                        <td>{m.proyecto_nombre}</td>
                        <td>{m.recibido_por}</td>
                        <td>
                          <span className={`badge ${m.fecha_entrada ? 'badge-success' : 'badge-warning'}`}>
                            {m.fecha_entrada ? 'Devuelta' : 'En uso'}
                          </span>
                        </td>
                        <td>{m.fecha_entrada || '—'}</td>
                        <td>{m.notas || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
              <button className="btn" onClick={() => setReporteOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
