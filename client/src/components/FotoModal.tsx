import React from 'react'

interface FotoModalProps {
  url: string
  label: string
  onClose: () => void
}

export default function FotoModal({ url, label, onClose }: FotoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3>{label}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      </div>
    </div>
  )
}
