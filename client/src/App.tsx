import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './components/Login'
import DashboardCards from './components/DashboardCards'
import UPSSection from './components/UPSSection'
import HerramientasSection from './components/HerramientasSection'
import ProyectosSection from './components/ProyectosSection'
import MovimientosSection from './components/MovimientosSection'
import PerfilModal from './components/PerfilModal'
import { apiFetch } from './api'
import type { StatsUPS, StatsHerr, StatsProy, Movimiento, UPS, Herramienta, Proyecto } from './types'

interface DashCounts {
  ups: number; herr: number; proy: number; mov: number;
}

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [section, setSection] = useState('ups')
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [dash, setDash] = useState<DashCounts>({ ups: 0, herr: 0, proy: 0, mov: 0 })

  const updateDash = async () => {
    const [up, he, pr, mo] = await Promise.all([
      apiFetch<UPS[]>('/ups'),
      apiFetch<Herramienta[]>('/herramientas'),
      apiFetch<Proyecto[]>('/proyectos'),
      apiFetch<Movimiento[]>('/movimientos'),
    ])
    setDash({
      ups: up?.length ?? 0,
      herr: he?.length ?? 0,
      proy: pr?.filter(p => p.estado !== 'cerrado').length ?? 0,
      mov: mo?.filter(m => !m.fecha_entrada).length ?? 0,
    })
  }

  useEffect(() => {
    document.body.classList.toggle('dark', localStorage.getItem('dark') === 'true')
  }, [])

  useEffect(() => {
    if (user) updateDash()
  }, [user])

  if (loading) {
    return (
      <div className="view-login">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <Layout activeTab={section} onTabChange={setSection} user={user} onLogout={logout} onPerfil={() => setPerfilOpen(true)}>
      <DashboardCards upsTotal={dash.ups} herrTotal={dash.herr} proyectosActivos={dash.proy} movimientosEnUso={dash.mov} />
      {section === 'ups' && <UPSSection />}
      {section === 'herramientas' && <HerramientasSection />}
      {section === 'proyectos' && <ProyectosSection />}
      {section === 'movimientos' && <MovimientosSection />}
      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
