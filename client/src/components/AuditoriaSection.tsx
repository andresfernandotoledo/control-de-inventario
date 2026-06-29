import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import type { AuditoriaLog } from '../types'

const PAGE_SIZE = 30
const TABLAS = ['', 'ups', 'herramientas', 'proyectos', 'movimientos', 'usuarios']
const TABLA_LABELS: Record<string, string> = { '': 'Todas', ups: 'UPS', herramientas: 'Herramientas', proyectos: 'Proyectos', movimientos: 'Movimientos', usuarios: 'Usuarios' }

export default function AuditoriaSection() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([])
  const [tablaFilter, setTablaFilter] = useState('')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => { setPage(0) }, [tablaFilter])

  useEffect(() => {
    const url = tablaFilter ? `/auditoria?tabla=${tablaFilter}` : '/auditoria'
    apiFetch<AuditoriaLog[]>(url).then(d => d && setLogs(d))
  }, [tablaFilter])

  const totalPages = Math.ceil(logs.length / PAGE_SIZE)
  const paginated = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="section-header">
        <h2>Auditoría</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filtrar por tabla:</label>
          <select value={tablaFilter} onChange={e => setTablaFilter(e.target.value)}>
            {TABLAS.map(t => <option key={t} value={t}>{TABLA_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Tabla</th>
                  <th>Acción</th>
                  <th>Registro ID</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No hay registros de auditoría.</td></tr>
                ) : paginated.map(log => (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{log.created_at}</td>
                      <td>{log.usuario_nombre}</td>
                      <td><span className="badge badge-info">{TABLA_LABELS[log.tabla] || log.tabla}</span></td>
                      <td>
                        <span className={`badge ${log.accion === 'CREATE' || log.accion === 'ENTRADA' ? 'badge-success' : log.accion === 'DELETE' ? 'badge-error' : 'badge-warning'}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td>{log.registro_id}</td>
                      <td>
                        {(log.datos_anteriores || log.datos_nuevos) ? (
                          <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                            {expanded === log.id ? 'Ocultar' : 'Ver cambios'}
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`det-${log.id}`}>
                        <td colSpan={6} style={{ padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {log.datos_anteriores && (
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <strong style={{ color: '#ef4444', fontSize: '0.8rem' }}>ANTERIOR</strong>
                                <pre style={{ fontSize: '0.75rem', marginTop: 4, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.datos_anteriores, null, 2)}</pre>
                              </div>
                            )}
                            {log.datos_nuevos && (
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <strong style={{ color: '#22c55e', fontSize: '0.8rem' }}>NUEVO</strong>
                                <pre style={{ fontSize: '0.75rem', marginTop: 4, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.datos_nuevos, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination" style={{ padding: '12px 16px' }}>
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <span>Página {page + 1} de {totalPages}</span>
              <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
