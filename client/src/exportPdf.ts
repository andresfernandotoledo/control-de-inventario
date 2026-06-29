import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPdf(title: string, headers: string[], rows: string[][], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  doc.setFontSize(16)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(new Date().toLocaleString('es-ES'), 14, 27)
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 32,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })
  doc.save(`${filename}.pdf`)
}
