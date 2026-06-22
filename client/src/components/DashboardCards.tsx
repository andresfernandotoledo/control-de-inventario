import React from 'react'

interface DashboardCardsProps {
  upsTotal: number
  herrTotal: number
  proyectosActivos: number
  movimientosEnUso: number
}

export default function DashboardCards({ upsTotal, herrTotal, proyectosActivos, movimientosEnUso }: DashboardCardsProps) {
  const cards = [
    { icon: '🔋', num: upsTotal, label: 'Total UPS' },
    { icon: '🔧', num: herrTotal, label: 'Total Herramientas' },
    { icon: '📋', num: proyectosActivos, label: 'Proyectos Activos' },
    { icon: '🔄', num: movimientosEnUso, label: 'Movimientos En Uso' },
  ]

  return (
    <div className="dash-cards">
      {cards.map((c, i) => (
        <div key={i} className="dash-card">
          <div className="dash-icon">{c.icon}</div>
          <div>
            <span className="dash-num">{c.num}</span>
            <span className="dash-label">{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
