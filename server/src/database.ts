import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename =
  typeof globalThis.__filename !== 'undefined'
    ? globalThis.__filename
    : fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbPath: string;
if ((process as any).pkg) {
  dbPath = join(dirname(process.execPath), 'data', 'inventario.db');
} else {
  dbPath = join(__dirname, '..', '..', 'data', 'inventario.db');
}

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

let SQL: SqlJsStatic;
let db: SqlJsDatabase;

function saveDB(): void {
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
}

function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const row = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  saveDB();
  return { changes, lastInsertRowid: row?.id || 0 };
}

/* ========== INTERFACES ========== */

export interface UPS {
  id: number;
  serial_number: string;
  modelo: string;
  capacidad: string;
  ubicacion: string;
  estado: 'activa' | 'entrada' | 'salida' | 'mantenimiento' | 'soporte_provisional' | 'baja';
  fecha_ingreso: string;
  fecha_salida: string | null;
  notas: string;
  created_at: string;
  updated_at: string;
}

export interface Herramienta {
  id: number;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  ubicacion: string;
  estado: 'disponible' | 'en_uso' | 'baja';
  fecha_adquisicion: string;
  notas: string;
  created_at: string;
  updated_at: string;
}

export interface Proyecto {
  id: number;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  responsable: string;
  created_at: string;
  herramientas_asignadas?: string;
  herramientas_activas?: number;
}

export interface Movimiento {
  id: number;
  herramienta_id: number;
  proyecto_id: number;
  fecha_salida: string;
  fecha_entrada: string | null;
  recibido_por: string;
  notas: string;
  created_at: string;
  herramienta_codigo?: string;
  herramienta_nombre?: string;
  proyecto_nombre?: string;
  proyecto_ubicacion?: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  password?: string;
  rol: 'admin' | 'usuario';
  created_at?: string;
}

export interface AuditoriaLog {
  id: number;
  tabla: string;
  accion: string;
  registro_id: number;
  datos_anteriores: any;
  datos_nuevos: any;
  usuario_id: number;
  created_at: string;
  usuario_nombre?: string;
}

/* ========== INIT ========== */

export async function initSchema(): Promise<void> {
  SQL = await initSqlJs();

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'usuario' CHECK(rol IN ('admin','usuario')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_number TEXT NOT NULL UNIQUE,
      modelo TEXT NOT NULL DEFAULT '',
      capacidad TEXT NOT NULL DEFAULT '',
      ubicacion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'activa' CHECK(estado IN ('activa','entrada','salida','mantenimiento','soporte_provisional','baja')),
      fecha_ingreso TEXT DEFAULT (date('now')),
      fecha_salida TEXT DEFAULT NULL,
      notas TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS herramientas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL DEFAULT '',
      marca TEXT NOT NULL DEFAULT '',
      modelo TEXT NOT NULL DEFAULT '',
      ubicacion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'disponible' CHECK(estado IN ('disponible','en_uso','baja')),
      fecha_adquisicion TEXT DEFAULT (date('now')),
      notas TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabla TEXT NOT NULL,
      accion TEXT NOT NULL,
      registro_id INTEGER NOT NULL,
      datos_anteriores TEXT DEFAULT NULL,
      datos_nuevos TEXT DEFAULT NULL,
      usuario_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ubicacion TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT '',
      fecha_inicio TEXT DEFAULT NULL,
      fecha_fin TEXT DEFAULT NULL,
      responsable TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'abierto' CHECK(estado IN ('abierto','cerrado')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS proyecto_herramientas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER NOT NULL,
      herramienta_id INTEGER NOT NULL,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
      FOREIGN KEY (herramienta_id) REFERENCES herramientas(id) ON DELETE CASCADE,
      UNIQUE(proyecto_id, herramienta_id)
    );

    CREATE TABLE IF NOT EXISTS movimientos_herramientas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      herramienta_id INTEGER NOT NULL,
      proyecto_id INTEGER NOT NULL,
      fecha_salida TEXT NOT NULL DEFAULT (date('now')),
      fecha_entrada TEXT DEFAULT NULL,
      recibido_por TEXT NOT NULL DEFAULT '',
      notas TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (herramienta_id) REFERENCES herramientas(id) ON DELETE CASCADE,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  const row = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM usuarios');
  if (row?.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [
      'Administrador', 'admin@inventario.com', hash, 'admin',
    ]);
    saveDB();
    console.log('Usuario admin creado: admin@inventario.com / admin123');
  }
}

/* ========== USUARIOS ========== */

export function findUserByEmail(email: string): Usuario | null {
  return queryOne<Usuario>('SELECT * FROM usuarios WHERE email = ?', [email]);
}

export function findUserById(id: number): Usuario | null {
  return queryOne<Usuario>('SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?', [id]);
}

export function createUser({
  nombre,
  email,
  password,
  rol,
}: {
  nombre: string;
  email: string;
  password: string;
  rol?: string;
}): Usuario | null {
  const hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [
    nombre, email, hash, rol || 'usuario',
  ]);
  return findUserById(result.lastInsertRowid);
}

export function updatePassword(id: number, newPassword: string): void {
  const hash = bcrypt.hashSync(newPassword, 10);
  run('UPDATE usuarios SET password = ? WHERE id = ?', [hash, id]);
}

/* ========== AUDITORIA ========== */

export function registrarAuditoria({
  tabla,
  accion,
  registro_id,
  datos_anteriores,
  datos_nuevos,
  usuario_id,
}: {
  tabla: string;
  accion: string;
  registro_id: number;
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id: number;
}): void {
  run(
    'INSERT INTO auditoria (tabla, accion, registro_id, datos_anteriores, datos_nuevos, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [
      tabla,
      accion,
      registro_id,
      datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      usuario_id,
    ]
  );
}

export function getAuditoria(tabla: string | null = null, limite: number = 100): AuditoriaLog[] {
  let sql = `SELECT a.*, u.nombre as usuario_nombre FROM auditoria a JOIN usuarios u ON a.usuario_id = u.id`;
  const params: any[] = [];
  if (tabla) {
    sql += ' WHERE a.tabla = ?';
    params.push(tabla);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT ?';
  params.push(limite);
  return queryAll<AuditoriaLog>(sql, params);
}

/* ========== UPS ========== */

export function getAllUPS(): UPS[] {
  return queryAll<UPS>('SELECT * FROM ups ORDER BY updated_at DESC');
}

export function getUPSById(id: number): UPS | null {
  return queryOne<UPS>('SELECT * FROM ups WHERE id = ?', [id]);
}

export function createUPS(
  {
    serial_number,
    modelo,
    capacidad,
    ubicacion,
    estado,
    notas,
  }: {
    serial_number: string;
    modelo?: string;
    capacidad?: string;
    ubicacion?: string;
    estado?: string;
    notas?: string;
  },
  usuario_id: number
): UPS | null {
  const result = run(
    'INSERT INTO ups (serial_number, modelo, capacidad, ubicacion, estado, notas) VALUES (?, ?, ?, ?, ?, ?)',
    [serial_number, modelo || '', capacidad || '', ubicacion || '', estado || 'activa', notas || '']
  );
  const newRecord = getUPSById(result.lastInsertRowid);
  registrarAuditoria({
    tabla: 'ups',
    accion: 'CREATE',
    registro_id: result.lastInsertRowid,
    datos_nuevos: newRecord,
    usuario_id,
  });
  return newRecord;
}

export function updateUPS(id: number, fields: Record<string, any>, usuario_id: number): UPS | null {
  const old = getUPSById(id);
  if (!old) return null;
  const allowed = ['serial_number', 'modelo', 'capacidad', 'ubicacion', 'estado', 'notas', 'fecha_ingreso', 'fecha_salida'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(fields[key] === '' && key !== 'notas' ? null : fields[key]);
    }
  }
  if (sets.length === 0) return old;
  vals.push(id);
  run(`UPDATE ups SET ${sets.join(', ')} WHERE id = ?`, vals);
  const newRecord = getUPSById(id);
  registrarAuditoria({ tabla: 'ups', accion: 'UPDATE', registro_id: id, datos_anteriores: old, datos_nuevos: newRecord, usuario_id });
  return newRecord;
}

export function deleteUPS(id: number, usuario_id: number): boolean {
  const old = getUPSById(id);
  if (!old) return false;
  run('DELETE FROM ups WHERE id = ?', [id]);
  registrarAuditoria({ tabla: 'ups', accion: 'DELETE', registro_id: id, datos_anteriores: old, usuario_id });
  return true;
}

export function getStatsUPS() {
  const estados = queryAll<any>('SELECT estado, COUNT(*) as count FROM ups GROUP BY estado');
  const total = queryOne<{ total: number }>('SELECT COUNT(*) as total FROM ups');
  const modelos = queryAll<any>(
    "SELECT modelo, COUNT(*) as count FROM ups WHERE modelo != '' GROUP BY modelo ORDER BY count DESC LIMIT 10"
  );
  const ubicaciones = queryAll<any>(
    "SELECT ubicacion, COUNT(*) as count FROM ups WHERE ubicacion != '' GROUP BY ubicacion ORDER BY count DESC LIMIT 10"
  );
  const ingresos_por_mes = queryAll<any>(`
    SELECT substr(fecha_ingreso, 1, 7) as mes, COUNT(*) as count
    FROM ups WHERE fecha_ingreso IS NOT NULL
    GROUP BY mes ORDER BY mes ASC LIMIT 12
  `);
  return {
    total: total?.total || 0,
    activas: estados.find((e: any) => e.estado === 'activa')?.count || 0,
    estados,
    modelos,
    ubicaciones,
    ingresos_por_mes,
  };
}

/* ========== HERRAMIENTAS ========== */

export function getAllHerramientas(): Herramienta[] {
  return queryAll<Herramienta>('SELECT * FROM herramientas ORDER BY updated_at DESC');
}

export function getHerramientaById(id: number): Herramienta | null {
  return queryOne<Herramienta>('SELECT * FROM herramientas WHERE id = ?', [id]);
}

export function createHerramienta(
  {
    codigo,
    nombre,
    marca,
    modelo,
    ubicacion,
    estado,
    notas,
  }: {
    codigo: string;
    nombre?: string;
    marca?: string;
    modelo?: string;
    ubicacion?: string;
    estado?: string;
    notas?: string;
  },
  usuario_id: number
): Herramienta | null {
  const result = run(
    'INSERT INTO herramientas (codigo, nombre, marca, modelo, ubicacion, estado, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [codigo, nombre || '', marca || '', modelo || '', ubicacion || '', estado || 'disponible', notas || '']
  );
  const newRecord = getHerramientaById(result.lastInsertRowid);
  registrarAuditoria({
    tabla: 'herramientas',
    accion: 'CREATE',
    registro_id: result.lastInsertRowid,
    datos_nuevos: newRecord,
    usuario_id,
  });
  return newRecord;
}

export function updateHerramienta(id: number, fields: Record<string, any>, usuario_id: number): Herramienta | null {
  const old = getHerramientaById(id);
  if (!old) return null;
  const allowed = ['codigo', 'nombre', 'marca', 'modelo', 'ubicacion', 'estado', 'notas', 'fecha_adquisicion'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      if (key === 'fecha_adquisicion' && !fields[key]) continue;
      sets.push(`${key} = ?`);
      vals.push(fields[key] === '' && key !== 'notas' ? null : fields[key]);
    }
  }
  if (sets.length === 0) return old;
  vals.push(id);
  run(`UPDATE herramientas SET ${sets.join(', ')} WHERE id = ?`, vals);
  const newRecord = getHerramientaById(id);
  registrarAuditoria({ tabla: 'herramientas', accion: 'UPDATE', registro_id: id, datos_anteriores: old, datos_nuevos: newRecord, usuario_id });
  return newRecord;
}

export function deleteHerramienta(id: number, usuario_id: number): boolean {
  const old = getHerramientaById(id);
  if (!old) return false;
  run('DELETE FROM herramientas WHERE id = ?', [id]);
  registrarAuditoria({ tabla: 'herramientas', accion: 'DELETE', registro_id: id, datos_anteriores: old, usuario_id });
  return true;
}

export function getStatsHerramientas() {
  const estados = queryAll<any>('SELECT estado, COUNT(*) as count FROM herramientas GROUP BY estado');
  const total = queryOne<{ total: number }>('SELECT COUNT(*) as total FROM herramientas');
  const marcas = queryAll<any>(
    "SELECT marca, COUNT(*) as count FROM herramientas WHERE marca != '' GROUP BY marca ORDER BY count DESC LIMIT 10"
  );
  const ubicaciones = queryAll<any>(
    "SELECT ubicacion, COUNT(*) as count FROM herramientas WHERE ubicacion != '' GROUP BY ubicacion ORDER BY count DESC LIMIT 10"
  );
  const adquisiciones_por_mes = queryAll<any>(`
    SELECT substr(fecha_adquisicion, 1, 7) as mes, COUNT(*) as count
    FROM herramientas WHERE fecha_adquisicion IS NOT NULL
    GROUP BY mes ORDER BY mes ASC LIMIT 12
  `);
  return {
    total: total?.total || 0,
    disponibles: estados.find((e: any) => e.estado === 'disponible')?.count || 0,
    estados,
    marcas,
    ubicaciones,
    adquisiciones_por_mes,
  };
}

export function getStatsProyectos() {
  const total = queryOne<{ total: number }>('SELECT COUNT(*) as total FROM proyectos');
  const abiertos = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM proyectos WHERE estado = 'abierto'");
  const cerrados = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM proyectos WHERE estado = 'cerrado'");
  const herramientas_por_proy = queryAll<any>(`
    SELECT p.nombre as proyecto, COUNT(ph.herramienta_id) as count
    FROM proyectos p LEFT JOIN proyecto_herramientas ph ON p.id = ph.proyecto_id
    GROUP BY p.id, p.nombre ORDER BY count DESC LIMIT 10
  `);
  const proyectos_mes = queryAll<any>(`
    SELECT substr(created_at, 1, 7) as mes, COUNT(*) as count
    FROM proyectos GROUP BY mes ORDER BY mes ASC LIMIT 12
  `);
  const responsables = queryAll<any>(`
    SELECT responsable, COUNT(*) as count FROM proyectos WHERE responsable != ''
    GROUP BY responsable ORDER BY count DESC LIMIT 10
  `);
  return {
    total: total?.total || 0,
    abiertos: abiertos?.count || 0,
    cerrados: cerrados?.count || 0,
    herramientas_por_proy,
    proyectos_mes,
    responsables,
  };
}

/* ========== PROYECTOS ========== */

export function getAllProyectos(): Proyecto[] {
  return queryAll<Proyecto>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM movimientos_herramientas WHERE proyecto_id = p.id AND fecha_entrada IS NULL) as herramientas_activas,
      (SELECT group_concat(h.id || '::' || h.nombre, '||') FROM proyecto_herramientas ph JOIN herramientas h ON ph.herramienta_id = h.id WHERE ph.proyecto_id = p.id) as herramientas_asignadas
    FROM proyectos p ORDER BY p.nombre ASC
  `);
}

export function getProyectoById(id: number): Proyecto | null {
  return queryOne<Proyecto>(`
    SELECT p.*,
      (SELECT group_concat(h.id || '::' || h.nombre, '||') FROM proyecto_herramientas ph JOIN herramientas h ON ph.herramienta_id = h.id WHERE ph.proyecto_id = p.id) as herramientas_asignadas
    FROM proyectos p WHERE p.id = ?
  `, [id]);
}

export function createProyecto({
  nombre,
  ubicacion,
  descripcion,
  fecha_inicio,
  fecha_fin,
  responsable,
}: {
  nombre: string;
  ubicacion?: string;
  descripcion?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  responsable?: string;
}): Proyecto | null {
  const result = run(
    'INSERT INTO proyectos (nombre, ubicacion, descripcion, fecha_inicio, fecha_fin, responsable) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, ubicacion || '', descripcion || '', fecha_inicio || null, fecha_fin || null, responsable || '']
  );
  return getProyectoById(result.lastInsertRowid);
}

export function updateProyecto(id: number, fields: Record<string, any>): Proyecto | null {
  const allowed = ['nombre', 'ubicacion', 'descripcion', 'fecha_inicio', 'fecha_fin', 'responsable'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(fields[key] || null);
    }
  }
  if (sets.length === 0) return getProyectoById(id);
  vals.push(id);
  run(`UPDATE proyectos SET ${sets.join(', ')} WHERE id = ?`, vals);
  return getProyectoById(id);
}

export function deleteProyecto(id: number): boolean {
  run('DELETE FROM proyecto_herramientas WHERE proyecto_id = ?', [id]);
  run('DELETE FROM movimientos_herramientas WHERE proyecto_id = ?', [id]);
  run('DELETE FROM proyectos WHERE id = ?', [id]);
  return true;
}

export function cerrarProyecto(id: number): Proyecto | null {
  run('DELETE FROM proyecto_herramientas WHERE proyecto_id = ?', [id]);
  run("UPDATE proyectos SET estado = 'cerrado' WHERE id = ?", [id]);
  return getProyectoById(id);
}

/* ========== PROYECTO HERRAMIENTAS ========== */

export function getProyectoHerramientas(proyectoId: number): any[] {
  return queryAll(
    `SELECT h.id, h.codigo, h.nombre, h.marca, h.modelo
     FROM proyecto_herramientas ph
     JOIN herramientas h ON ph.herramienta_id = h.id
     WHERE ph.proyecto_id = ?
     ORDER BY h.nombre ASC`,
    [proyectoId]
  );
}

export function setProyectoHerramientas(proyectoId: number, herramientaIds: number[]): void {
  if (herramientaIds && herramientaIds.length > 0) {
    const phs = herramientaIds.map(() => '?').join(',');
    db.run(`DELETE FROM proyecto_herramientas WHERE herramienta_id IN (${phs}) AND proyecto_id != ?`, [
      ...herramientaIds, proyectoId,
    ]);
  }
  db.run('DELETE FROM proyecto_herramientas WHERE proyecto_id = ?', [proyectoId]);
  if (!herramientaIds || herramientaIds.length === 0) {
    saveDB();
    return;
  }
  for (const hid of herramientaIds) {
    db.run('INSERT INTO proyecto_herramientas (proyecto_id, herramienta_id) VALUES (?, ?)', [proyectoId, hid]);
  }
  saveDB();
}

/* ========== MOVIMIENTOS ========== */

export function getAllMovimientos(): Movimiento[] {
  return queryAll<Movimiento>(`
    SELECT m.*, h.codigo as herramienta_codigo, h.nombre as herramienta_nombre,
           p.nombre as proyecto_nombre, p.ubicacion as proyecto_ubicacion
    FROM movimientos_herramientas m
    JOIN herramientas h ON m.herramienta_id = h.id
    JOIN proyectos p ON m.proyecto_id = p.id
    ORDER BY m.fecha_salida DESC, m.created_at DESC
  `);
}

export function getMovimientosActivos(): Movimiento[] {
  return queryAll<Movimiento>(`
    SELECT m.*, h.codigo as herramienta_codigo, h.nombre as herramienta_nombre,
           p.nombre as proyecto_nombre, p.ubicacion as proyecto_ubicacion
    FROM movimientos_herramientas m
    JOIN herramientas h ON m.herramienta_id = h.id
    JOIN proyectos p ON m.proyecto_id = p.id
    WHERE m.fecha_entrada IS NULL
    ORDER BY m.fecha_salida DESC
  `);
}

export function getMovimientosPorProyecto(proyectoId: number): Movimiento[] {
  return queryAll<Movimiento>(
    `SELECT m.*, h.codigo as herramienta_codigo, h.nombre as herramienta_nombre
     FROM movimientos_herramientas m
     JOIN herramientas h ON m.herramienta_id = h.id
     WHERE m.proyecto_id = ?
     ORDER BY m.fecha_salida DESC`,
    [proyectoId]
  );
}

export function salidaHerramienta({
  herramienta_id,
  proyecto_id,
  fecha_salida,
  recibido_por,
  notas,
}: {
  herramienta_id: number;
  proyecto_id: number;
  fecha_salida?: string;
  recibido_por?: string;
  notas?: string;
}): Movimiento | null {
  run("UPDATE herramientas SET estado = 'en_uso' WHERE id = ?", [herramienta_id]);
  const result = run(
    'INSERT INTO movimientos_herramientas (herramienta_id, proyecto_id, fecha_salida, recibido_por, notas) VALUES (?, ?, ?, ?, ?)',
    [herramienta_id, proyecto_id, fecha_salida || new Date().toISOString().slice(0, 10), recibido_por || '', notas || '']
  );
  return getMovimientoById(result.lastInsertRowid);
}

export function entradaHerramienta(
  id: number,
  { fecha_entrada, notas }: { fecha_entrada?: string; notas?: string }
): Movimiento | null {
  const mov = getMovimientoById(id);
  if (!mov) return null;
  run("UPDATE herramientas SET estado = 'disponible' WHERE id = ?", [mov.herramienta_id]);
  const notaExtra = notas ? ` | ${notas}` : '';
  run('UPDATE movimientos_herramientas SET fecha_entrada = ?, notas = notas || ? WHERE id = ?', [
    fecha_entrada || new Date().toISOString().slice(0, 10), notaExtra, id,
  ]);
  return getMovimientoById(id);
}

export function getMovimientoById(id: number): Movimiento | null {
  return queryOne<Movimiento>(
    `SELECT m.*, h.codigo as herramienta_codigo, h.nombre as herramienta_nombre,
            p.nombre as proyecto_nombre
     FROM movimientos_herramientas m
     JOIN herramientas h ON m.herramienta_id = h.id
     JOIN proyectos p ON m.proyecto_id = p.id
     WHERE m.id = ?`,
    [id]
  );
}

export function getReporteMovimientos(proyectoId: number | null, fechaDesde?: string, fechaHasta?: string): any[] {
  let sql = `
    SELECT m.fecha_salida, m.fecha_entrada, m.recibido_por, m.notas,
           h.codigo as herramienta_codigo, h.nombre as herramienta_nombre, h.marca, h.modelo,
           p.nombre as proyecto_nombre, p.ubicacion as proyecto_ubicacion
    FROM movimientos_herramientas m
    JOIN herramientas h ON m.herramienta_id = h.id
    JOIN proyectos p ON m.proyecto_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (proyectoId) {
    sql += ' AND m.proyecto_id = ?';
    params.push(proyectoId);
  }
  if (fechaDesde) {
    sql += ' AND m.fecha_salida >= ?';
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    sql += ' AND m.fecha_salida <= ?';
    params.push(fechaHasta);
  }
  sql += ' ORDER BY m.fecha_salida DESC, h.nombre ASC';
  return queryAll(sql, params);
}

export function getHistorialHerramienta(herramientaId: number): Movimiento[] {
  return queryAll<Movimiento>(
    `SELECT m.*, p.nombre as proyecto_nombre, p.ubicacion as proyecto_ubicacion
     FROM movimientos_herramientas m
     JOIN proyectos p ON m.proyecto_id = p.id
     WHERE m.herramienta_id = ?
     ORDER BY m.fecha_salida DESC, m.created_at DESC`,
    [herramientaId]
  );
}

/* ========== BACKUP ========== */

export function backupDB() {
  const ups = getAllUPS();
  const herramientas = getAllHerramientas();
  const usuarios = queryAll<Usuario>('SELECT id, nombre, email, rol, created_at FROM usuarios');
  return { ups, herramientas, usuarios, fecha: new Date().toISOString() };
}

export function restoreDB(data: any): void {
  if (data.ups) {
    db.run('DELETE FROM ups');
    for (const u of data.ups) {
      db.run(
        `INSERT INTO ups (id, serial_number, modelo, capacidad, ubicacion, estado, fecha_ingreso, fecha_salida, notas, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.serial_number, u.modelo, u.capacidad, u.ubicacion, u.estado, u.fecha_ingreso, u.fecha_salida, u.notas, u.created_at, u.updated_at]
      );
    }
  }
  if (data.herramientas) {
    db.run('DELETE FROM herramientas');
    for (const h of data.herramientas) {
      db.run(
        `INSERT INTO herramientas (id, codigo, nombre, marca, modelo, ubicacion, estado, fecha_adquisicion, notas, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [h.id, h.codigo, h.nombre, h.marca, h.modelo, h.ubicacion, h.estado, h.fecha_adquisicion, h.notas, h.created_at, h.updated_at]
      );
    }
  }
  saveDB();
}
