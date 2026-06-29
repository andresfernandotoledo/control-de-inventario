import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

type ToastType = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let nextId = 0

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 300)
    }, 4000)
  }, [])

  const dismiss = (id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'toast-out' : ''}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
