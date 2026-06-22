export interface Usuario { id: number; nombre: string; email: string; rol: string; }

export interface UPS {
  id: number
  serial_number: string
  modelo: string
  capacidad: string
  ubicacion: string
  estado: UPSEstado
  fecha_ingreso: string | null
  fecha_salida: string | null
  notas: string
  created_at: string
  updated_at: string
}

export type UPSEstado = 'activa' | 'entrada' | 'salida' | 'mantenimiento' | 'soporte_provisional' | 'baja'

export type HerrEstado = 'disponible' | 'en_uso' | 'baja'

export interface Herramienta {
  id: number
  codigo: string
  nombre: string
  marca: string
  modelo: string
  ubicacion: string
  estado: HerrEstado
  fecha_adquisicion: string | null
  notas: string
  created_at: string
  updated_at: string
}

export interface Proyecto {
  id: number
  nombre: string
  ubicacion: string
  descripcion: string
  fecha_inicio: string | null
  fecha_fin: string | null
  responsable: string
  created_at: string
  herramientas_activas: number
  herramientas_asignadas: string | null
  estado: string
}

export interface Movimiento {
  id: number
  herramienta_id: number
  proyecto_id: number
  fecha_salida: string
  fecha_entrada: string | null
  recibido_por: string
  notas: string
  created_at: string
  herramienta_codigo: string
  herramienta_nombre: string
  proyecto_nombre: string
  proyecto_ubicacion: string
}

export interface AuditoriaLog {
  id: number
  tabla: string
  accion: string
  registro_id: number
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  usuario_id: number
  created_at: string
  usuario_nombre: string
}

export interface StatsUPS {
  total: number
  activas: number
  estados: { estado: UPSEstado; count: number }[]
  modelos: { modelo: string; count: number }[]
  ubicaciones: { ubicacion: string; count: number }[]
  ingresos_por_mes: { mes: string; count: number }[]
}

export interface StatsHerr {
  total: number
  disponibles: number
  estados: { estado: HerrEstado; count: number }[]
  marcas: { marca: string; count: number }[]
  ubicaciones: { ubicacion: string; count: number }[]
  adquisiciones_por_mes: { mes: string; count: number }[]
}

export interface StatsProy {
  total: number
  abiertos: number
  cerrados: number
  herramientas_por_proy: { proyecto: string; count: number }[]
  proyectos_mes: { mes: string; count: number }[]
  responsables: { responsable: string; count: number }[]
}

export interface LoginResponse { token: string; usuario: Usuario }

export const estadoLabelsUPS: Record<string, string> = {
  activa: 'Activa',
  entrada: 'Entrada',
  salida: 'Salida',
  mantenimiento: 'Mantenimiento',
  soporte_provisional: 'Soporte Provisional',
  baja: 'Baja',
}

export const estadoColorsUPS: Record<string, string> = {
  activa: '#22c55e',
  entrada: '#3b82f6',
  salida: '#6366f1',
  mantenimiento: '#06b6d4',
  soporte_provisional: '#8b5cf6',
  baja: '#ef4444',
}

export const estadoLabelsHerr: Record<string, string> = {
  disponible: 'Disponible',
  en_uso: 'En Uso',
  baja: 'Baja',
}

export const estadoColorsHerr: Record<string, string> = {
  disponible: '#22c55e',
  en_uso: '#f59e0b',
  baja: '#ef4444',
}

export const PAGE_SIZE = 15
