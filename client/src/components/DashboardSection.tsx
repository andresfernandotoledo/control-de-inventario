import React, { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { apiFetch } from '../api'
import DashboardCards from './DashboardCards'

Chart.register(...registerables)

interface DashData {
  ups: { total: number; activas: number; estados: { estado: string; count: number }[] }
  herramientas: { total: number; disponibles: number; estados: { estado: string; count: number }[] }
  proyectos: { total: number; abiertos: number; cerrados: number }
  movimientosActivos: number
}

export default function DashboardSection() {
  const [data, setData] = React.useState<DashData | null>(null)
  const [dashCounts, setDashCounts] = React.useState({ ups: 0, herr: 0, proy: 0, mov: 0 })
  const upsRef = useRef<HTMLCanvasElement>(null)
  const herrRef = useRef<HTMLCanvasElement>(null)
  const proyRef = useRef<HTMLCanvasElement>(null)
  const chartsRef = useRef<Chart[]>([])

  useEffect(() => {
    Promise.all([
      apiFetch<any>('/stats/ups'),
      apiFetch<any>('/stats/herramientas'),
      apiFetch<any>('/stats/proyectos'),
      apiFetch<any[]>('/movimientos/activos'),
    ]).then(([ups, herramientas, proyectos, movimientos]) => {
      if (!ups || !herramientas || !proyectos) return
      const d: DashData = {
        ups: { total: ups.total, activas: ups.activas, estados: ups.estados || [] },
        herramientas: { total: herramientas.total, disponibles: herramientas.disponibles, estados: herramientas.estados || [] },
        proyectos: { total: proyectos.total, abiertos: proyectos.abiertos, cerrados: proyectos.cerrados },
        movimientosActivos: movimientos?.length || 0,
      }
      setData(d)
      setDashCounts({ ups: d.ups.total, herr: d.herramientas.total, proy: d.proyectos.abiertos, mov: d.movimientosActivos })
    })
  }, [])

  useEffect(() => {
    if (!data) return
    chartsRef.current.forEach(c => c.destroy())
    chartsRef.current = []

    if (upsRef.current) {
      chartsRef.current.push(new Chart(upsRef.current, {
        type: 'doughnut',
        data: {
          labels: data.ups.estados.map(e => e.estado),
          datasets: [{ data: data.ups.estados.map(e => e.count), backgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#a855f7', '#ef4444'] }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      }))
    }

    if (herrRef.current) {
      chartsRef.current.push(new Chart(herrRef.current, {
        type: 'doughnut',
        data: {
          labels: data.herramientas.estados.map(e => e.estado === 'disponible' ? 'Disponible' : e.estado === 'en_uso' ? 'En Uso' : 'Baja'),
          datasets: [{ data: data.herramientas.estados.map(e => e.count), backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      }))
    }

    if (proyRef.current) {
      chartsRef.current.push(new Chart(proyRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Abiertos', 'Cerrados'],
          datasets: [{ data: [data.proyectos.abiertos, data.proyectos.cerrados], backgroundColor: ['#3b82f6', '#94a3b8'] }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
      }))
    }

    return () => { chartsRef.current.forEach(c => c.destroy()) }
  }, [data])

  return (
    <section>
      <DashboardCards upsTotal={dashCounts.ups} herrTotal={dashCounts.herr} proyectosActivos={dashCounts.proy} movimientosEnUso={dashCounts.mov} />
      {data && (
        <div className="charts-grid" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header"><h3>UPS por Estado</h3></div>
            <div className="card-body chart-container"><canvas ref={upsRef} /></div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Herramientas por Estado</h3></div>
            <div className="card-body chart-container"><canvas ref={herrRef} /></div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Proyectos</h3></div>
            <div className="card-body chart-container"><canvas ref={proyRef} /></div>
          </div>
        </div>
      )}
      {!data && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          Cargando estadísticas...
        </div>
      )}
    </section>
  )
}
