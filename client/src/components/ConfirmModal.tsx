import React, { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  input?: boolean
  inputLabel?: string
  inputValue?: string
  onInputChange?: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger', input, inputLabel, inputValue, onInputChange,
  onConfirm, onCancel,
}: ConfirmModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && input) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, input])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header"><h3>{title}</h3></div>
        <div className="modal-body">
          <p style={{ marginBottom: input ? 12 : 0, color: 'var(--text-secondary)' }}>{message}</p>
          {input && (
            <div className="form-group">
              <label>{inputLabel}</label>
              <input ref={inputRef} className="input" value={inputValue || ''} onChange={e => onInputChange?.(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
