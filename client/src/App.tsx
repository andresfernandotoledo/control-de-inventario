import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './components/Login'
import DashboardSection from './components/DashboardSection'
import UPSSection from './components/UPSSection'
import HerramientasSection from './components/HerramientasSection'
import ProyectosSection from './components/ProyectosSection'
import MovimientosSection from './components/MovimientosSection'
import AuditoriaSection from './components/AuditoriaSection'
import PerfilModal from './components/PerfilModal'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [section, setSection] = useState('dashboard')
  const [perfilOpen, setPerfilOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark', localStorage.getItem('dark') === 'true')
  }, [])

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
      {section === 'dashboard' && <DashboardSection />}
      {section === 'ups' && <UPSSection />}
      {section === 'herramientas' && <HerramientasSection />}
      {section === 'proyectos' && <ProyectosSection />}
      {section === 'movimientos' && <MovimientosSection />}
      {section === 'auditoria' && <AuditoriaSection />}
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
