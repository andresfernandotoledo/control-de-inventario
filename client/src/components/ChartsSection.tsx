import React, { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface ChartDef {
  type: 'bar' | 'line' | 'doughnut'
  data: { labels: string[]; datasets: { label?: string; data: number[]; backgroundColor?: string | string[]; borderColor?: string; fill?: boolean }[] }
  options?: Record<string, unknown>
}

function getChartConfigs(section: string, stats: any): { id: string; title: string; config: ChartDef }[] {
  switch (section) {
    case 'ups':
      return [
        { id: 'ups-estados', title: 'Estados', config: { type: 'doughnut', data: { labels: stats.estados.map((e: any) => e.estado), datasets: [{ data: stats.estados.map((e: any) => e.count), backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'] }] } } },
        { id: 'ups-modelos', title: 'Modelos', config: { type: 'bar', data: { labels: stats.modelos.map((e: any) => e.modelo), datasets: [{ label: 'Cantidad', data: stats.modelos.map((e: any) => e.count), backgroundColor: '#3b82f6' }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'ups-ubicaciones', title: 'Ubicaciones', config: { type: 'bar', data: { labels: stats.ubicaciones.map((e: any) => e.ubicacion), datasets: [{ label: 'Cantidad', data: stats.ubicaciones.map((e: any) => e.count), backgroundColor: '#22c55e' }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'ups-ingresos', title: 'Ingresos por Mes', config: { type: 'line', data: { labels: stats.ingresos_por_mes.map((e: any) => e.mes), datasets: [{ label: 'Ingresos', data: stats.ingresos_por_mes.map((e: any) => e.count), borderColor: '#3b82f6', fill: false }] }, options: { responsive: true, maintainAspectRatio: false } } },
      ]
    case 'herramientas':
      return [
        { id: 'herr-estados', title: 'Estados', config: { type: 'doughnut', data: { labels: stats.estados.map((e: any) => e.estado), datasets: [{ data: stats.estados.map((e: any) => e.count), backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] } } },
        { id: 'herr-marcas', title: 'Marcas', config: { type: 'bar', data: { labels: stats.marcas.map((e: any) => e.marca), datasets: [{ label: 'Cantidad', data: stats.marcas.map((e: any) => e.count), backgroundColor: '#8b5cf6' }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'herr-ubicaciones', title: 'Ubicaciones', config: { type: 'bar', data: { labels: stats.ubicaciones.map((e: any) => e.ubicacion), datasets: [{ label: 'Cantidad', data: stats.ubicaciones.map((e: any) => e.count), backgroundColor: '#06b6d4' }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'herr-adquisiciones', title: 'Adquisiciones por Mes', config: { type: 'line', data: { labels: stats.adquisiciones_por_mes.map((e: any) => e.mes), datasets: [{ label: 'Adquisiciones', data: stats.adquisiciones_por_mes.map((e: any) => e.count), borderColor: '#22c55e', fill: false }] }, options: { responsive: true, maintainAspectRatio: false } } },
      ]
    case 'proyectos':
      return [
        { id: 'proy-herramientas', title: 'Herramientas por Proyecto', config: { type: 'bar', data: { labels: stats.herramientas_por_proy.map((e: any) => e.proyecto), datasets: [{ label: 'Cantidad', data: stats.herramientas_por_proy.map((e: any) => e.count), backgroundColor: '#f59e0b' }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'proy-mes', title: 'Proyectos por Mes', config: { type: 'line', data: { labels: stats.proyectos_mes.map((e: any) => e.mes), datasets: [{ label: 'Proyectos', data: stats.proyectos_mes.map((e: any) => e.count), borderColor: '#3b82f6', fill: false }] }, options: { responsive: true, maintainAspectRatio: false } } },
        { id: 'proy-responsables', title: 'Responsables', config: { type: 'bar', data: { labels: stats.responsables.map((e: any) => e.responsable), datasets: [{ label: 'Cantidad', data: stats.responsables.map((e: any) => e.count), backgroundColor: '#22c55e' }] }, options: { responsive: true, maintainAspectRatio: false } } },
      ]
    default:
      return []
  }
}

function ChartCard({ title, config }: { title: string; config: ChartDef }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, config as any)
    return () => chartRef.current?.destroy()
  }, [config.data, config.type, config.options])

  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body">
        <div className="chart-container">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}

export default function ChartsSection({ section, stats }: { section: string; stats: any }) {
  const configs = getChartConfigs(section, stats)

  return (
    <div className="charts-grid">
      {configs.map(cfg => (
        <ChartCard key={cfg.id} title={cfg.title} config={cfg.config} />
      ))}
    </div>
  )
}
