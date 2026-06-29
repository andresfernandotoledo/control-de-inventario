import React, { useState, useEffect, type ReactNode } from 'react'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'ups', label: 'UPS', icon: '🔋' },
  { id: 'herramientas', label: 'Herramientas', icon: '🔧' },
  { id: 'proyectos', label: 'Proyectos', icon: '📋' },
  { id: 'movimientos', label: 'Movimientos', icon: '🔄' },
  { id: 'auditoria', label: 'Auditoría', icon: '📜' },
]

interface LayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: { nombre: string; email: string; rol?: string } | null
  onLogout: () => void
  onPerfil: () => void
  children: ReactNode
}

export default function Layout({ activeTab, onTabChange, user, onLogout, onPerfil, children }: LayoutProps) {
  const [dark, setDark] = useState(() => localStorage.getItem('dark') === 'true')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('dark', String(dark))
  }, [dark])

  const closeSidebar = () => setSidebarOpen(false)
  const handleTab = (tab: string) => { onTabChange(tab); closeSidebar() }

  return (
    <div className={`view ${sidebarOpen ? 'sidebar-expanded' : ''}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={closeSidebar}>×</button>
          <div className="brand-frame">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="22" width="48" height="34" rx="4" fill="var(--primary)"/>
              <path d="M8 30h48v4H8z" fill="var(--warning)"/>
              <path d="M24 36v12M16 42h16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M44 36l-6 6-3-3" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M32 6L12 22h40z" fill="var(--primary-hover)"/>
              <line x1="32" y1="6" x2="32" y2="22" stroke="var(--warning)" stroke-width="2.5"/>
            </svg>
            <div className="brand-label">Inventario</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(t => (
            <div
              key={t.id}
              className={`tab ${activeTab === t.id ? 'tab-active' : ''}`}
              onClick={() => handleTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="tab" onClick={() => { onPerfil(); closeSidebar() }}>
            <span className="tab-icon">👤</span>
            <span>Perfil</span>
          </div>
          <div className="tab" onClick={() => setDark(d => !d)}>
            <span className="tab-icon">{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </div>
          <div className="tab" onClick={() => { onLogout(); closeSidebar() }}>
            <span className="tab-icon">🚪</span>
            <span>Cerrar Sesión</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="main-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          {user && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user.nombre} &mdash; {user.email}
            </span>
          )}
        </div>
        {children}
      </main>
    </div>
  )
}
