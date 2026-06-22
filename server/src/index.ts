import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import * as db from './database.js';
import { generarToken, verificarToken } from './middleware.js';
import 'dotenv/config';

const __filename = typeof globalThis.__filename !== 'undefined' ? globalThis.__filename : fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let staticDir: string;
if ((process as any).pkg) {
  staticDir = join(dirname(process.execPath), 'client', 'dist');
} else {
  staticDir = join(__dirname, '..', '..', 'client', 'dist');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(staticDir));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Demasiadas solicitudes' } });
app.use('/api/', limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos' } });

/* ========== AUTH ========== */

app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email y contraseña requeridos' }); return; }
    const usuario = db.findUserByEmail(email);
    if (!usuario || !bcrypt.compareSync(password, usuario.password!)) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    const token = generarToken(usuario);
    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) { res.status(400).json({ error: 'Todos los campos son obligatorios' }); return; }
    if (password.length < 6) { res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' }); return; }
    const existente = db.findUserByEmail(email);
    if (existente) { res.status(409).json({ error: 'El email ya está registrado' }); return; }
    const usuario = db.createUser({ nombre, email, password, rol: 'usuario' });
    const token = generarToken(usuario!);
    res.status(201).json({ token, usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/auth/me', verificarToken, (req: Request, res: Response) => res.json(req.usuario));

app.post('/api/auth/verify-password', verificarToken, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) { res.status(400).json({ error: 'Contraseña requerida' }); return; }
    if (req.usuario!.rol !== 'admin') { res.status(403).json({ error: 'Solo administradores' }); return; }
    const usuario = db.findUserByEmail(req.usuario!.email);
    if (!bcrypt.compareSync(password, usuario!.password!)) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/auth/password', verificarToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Ambas contraseñas son requeridas' }); return; }
    if (newPassword.length < 6) { res.status(400).json({ error: 'Mínimo 6 caracteres' }); return; }
    const usuario = db.findUserByEmail(req.usuario!.email);
    if (!bcrypt.compareSync(currentPassword, usuario!.password!)) {
      res.status(400).json({ error: 'Contraseña actual incorrecta' });
      return;
    }
    db.updatePassword(req.usuario!.id, newPassword);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ========== AUDITORIA ========== */

app.get('/api/auditoria', verificarToken, async (req: Request, res: Response) => {
  try {
    const { tabla } = req.query;
    const logs = db.getAuditoria(typeof tabla === 'string' ? tabla : null, 200);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ========== EXPORTAR EXCEL ========== */

app.get('/api/export/:tipo', verificarToken, async (req: Request, res: Response) => {
  try {
    const { tipo } = req.params;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Inventario';
    const sheet = workbook.addWorksheet(tipo === 'ups' ? 'UPS' : 'Herramientas');

    if (tipo === 'ups') {
      const data = db.getAllUPS();
      sheet.columns = [
        { header: 'Serie', key: 'serial_number', width: 20 },
        { header: 'Modelo', key: 'modelo', width: 20 },
        { header: 'Capacidad', key: 'capacidad', width: 15 },
        { header: 'Ubicación', key: 'ubicacion', width: 20 },
        { header: 'Estado', key: 'estado', width: 18 },
        { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 15 },
        { header: 'Fecha Salida', key: 'fecha_salida', width: 15 },
        { header: 'Notas', key: 'notas', width: 30 },
      ];
      data.forEach(row => sheet.addRow(row));
    } else {
      const data = db.getAllHerramientas();
      sheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Marca', key: 'marca', width: 15 },
        { header: 'Modelo', key: 'modelo', width: 15 },
        { header: 'Ubicación', key: 'ubicacion', width: 20 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Adquisición', key: 'fecha_adquisicion', width: 15 },
        { header: 'Notas', key: 'notas', width: 30 },
      ];
      data.forEach(row => sheet.addRow(row));
    }

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${tipo}-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar' });
  }
});

/* ========== BACKUP ========== */

app.get('/api/backup', verificarToken, async (req: Request, res: Response) => {
  try {
    const data = db.backupDB();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar backup' });
  }
});

app.post('/api/backup/restore', verificarToken, async (req: Request, res: Response) => {
  try {
    if (!req.body || (!req.body.ups && !req.body.herramientas)) {
      res.status(400).json({ error: 'Archivo de backup inválido' });
      return;
    }
    db.restoreDB(req.body);
    res.json({ message: 'Restauración completada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restaurar' });
  }
});

/* ========== STATS ========== */

app.get('/api/stats/ups', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getStatsUPS()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/stats/herramientas', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getStatsHerramientas()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/stats/proyectos', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getStatsProyectos()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== UPS CRUD ========== */

app.get('/api/ups', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getAllUPS()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/ups/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const ups = db.getUPSById(Number(req.params.id));
    if (!ups) { res.status(404).json({ error: 'UPS no encontrada' }); return; }
    res.json(ups);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/ups', verificarToken, async (req: Request, res: Response) => {
  try {
    const { serial_number, modelo, capacidad, ubicacion, estado, notas } = req.body;
    if (!serial_number || !serial_number.trim()) { res.status(400).json({ error: 'El número de serie es obligatorio' }); return; }
    const ups = db.createUPS({ serial_number: serial_number.trim(), modelo, capacidad, ubicacion, estado, notas }, req.usuario!.id);
    res.status(201).json(ups);
  } catch (err) {
    if ((err as Error)?.message?.includes('UNIQUE constraint')) { res.status(409).json({ error: 'El número de serie ya existe' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/ups/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const ups = db.updateUPS(id, req.body, req.usuario!.id);
    if (!ups) { res.status(404).json({ error: 'UPS no encontrada' }); return; }
    res.json(ups);
  } catch (err) {
    if ((err as Error)?.message?.includes('UNIQUE constraint')) { res.status(409).json({ error: 'El número de serie ya existe' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/ups/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const ok = db.deleteUPS(Number(req.params.id), req.usuario!.id);
    if (!ok) { res.status(404).json({ error: 'UPS no encontrada' }); return; }
    res.json({ message: 'UPS eliminada' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== HERRAMIENTAS CRUD ========== */

app.get('/api/herramientas', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getAllHerramientas()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/herramientas/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const h = db.getHerramientaById(Number(req.params.id));
    if (!h) { res.status(404).json({ error: 'Herramienta no encontrada' }); return; }
    res.json(h);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/herramientas', verificarToken, async (req: Request, res: Response) => {
  try {
    const { codigo, nombre, marca, modelo, ubicacion, estado, notas } = req.body;
    if (!codigo || !codigo.trim()) { res.status(400).json({ error: 'El código es obligatorio' }); return; }
    const h = db.createHerramienta({ codigo: codigo.trim(), nombre, marca, modelo, ubicacion, estado, notas }, req.usuario!.id);
    res.status(201).json(h);
  } catch (err) {
    if ((err as Error)?.message?.includes('UNIQUE constraint')) { res.status(409).json({ error: 'El código ya existe' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/herramientas/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const h = db.updateHerramienta(id, req.body, req.usuario!.id);
    if (!h) { res.status(404).json({ error: 'Herramienta no encontrada' }); return; }
    res.json(h);
  } catch (err) {
    if ((err as Error)?.message?.includes('UNIQUE constraint')) { res.status(409).json({ error: 'El código ya existe' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/herramientas/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const ok = db.deleteHerramienta(Number(req.params.id), req.usuario!.id);
    if (!ok) { res.status(404).json({ error: 'Herramienta no encontrada' }); return; }
    res.json({ message: 'Herramienta eliminada' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/herramientas/:id/historial', verificarToken, async (req: Request, res: Response) => {
  try {
    const historial = db.getHistorialHerramienta(Number(req.params.id));
    res.json(historial);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== PROYECTOS ========== */

app.get('/api/proyectos', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getAllProyectos()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/proyectos', verificarToken, async (req: Request, res: Response) => {
  try {
    const { nombre, ubicacion, descripcion, fecha_inicio, fecha_fin, responsable } = req.body;
    if (!nombre || !nombre.trim()) { res.status(400).json({ error: 'El nombre es obligatorio' }); return; }
    const p = db.createProyecto({ nombre: nombre.trim(), ubicacion, descripcion, fecha_inicio, fecha_fin, responsable });
    if (req.body.herramientas && req.body.herramientas.length > 0) {
      db.setProyectoHerramientas(p!.id, req.body.herramientas);
    }
    res.status(201).json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.put('/api/proyectos/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    let p = db.updateProyecto(id, req.body);
    if (!p) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
    if (req.body.herramientas !== undefined) {
      db.setProyectoHerramientas(id, req.body.herramientas);
    }
    p = db.getProyectoById(id);
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/proyectos/:id/herramientas', verificarToken, async (req: Request, res: Response) => {
  try {
    const herramientas = db.getProyectoHerramientas(Number(req.params.id));
    res.json(herramientas);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.put('/api/proyectos/:id/herramientas', verificarToken, async (req: Request, res: Response) => {
  try {
    db.setProyectoHerramientas(Number(req.params.id), req.body.herramientas || []);
    res.json({ message: 'Herramientas actualizadas' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.put('/api/proyectos/:id/cerrar', verificarToken, async (req: Request, res: Response) => {
  try {
    const p = db.cerrarProyecto(Number(req.params.id));
    if (!p) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.put('/api/proyectos/:id/responsable', verificarToken, async (req: Request, res: Response) => {
  try {
    const { responsable } = req.body;
    if (!responsable || !responsable.trim()) { res.status(400).json({ error: 'El responsable es obligatorio' }); return; }
    const p = db.updateProyecto(Number(req.params.id), { responsable: responsable.trim() });
    if (!p) { res.status(404).json({ error: 'Proyecto no encontrado' }); return; }
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.delete('/api/proyectos/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    db.deleteProyecto(Number(req.params.id));
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== MOVIMIENTOS ========== */

app.get('/api/movimientos', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getAllMovimientos()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/movimientos/activos', verificarToken, async (_req: Request, res: Response) => {
  try { res.json(db.getMovimientosActivos()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/movimientos/proyecto/:id', verificarToken, async (req: Request, res: Response) => {
  try { res.json(db.getMovimientosPorProyecto(Number(req.params.id))); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/api/movimientos/salida', verificarToken, async (req: Request, res: Response) => {
  try {
    const { herramienta_id, proyecto_id, fecha_salida, recibido_por, notas } = req.body;
    if (!herramienta_id || !proyecto_id) { res.status(400).json({ error: 'Herramienta y proyecto obligatorios' }); return; }
    const mov = db.salidaHerramienta({ herramienta_id, proyecto_id, fecha_salida, recibido_por, notas });
    db.registrarAuditoria({ tabla: 'movimientos', accion: 'SALIDA', registro_id: mov!.id, datos_nuevos: mov, usuario_id: req.usuario!.id });
    res.status(201).json(mov);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.put('/api/movimientos/entrada/:id', verificarToken, async (req: Request, res: Response) => {
  try {
    const { fecha_entrada, notas } = req.body;
    const mov = db.entradaHerramienta(Number(req.params.id), { fecha_entrada, notas });
    if (!mov) { res.status(404).json({ error: 'Movimiento no encontrado' }); return; }
    db.registrarAuditoria({ tabla: 'movimientos', accion: 'ENTRADA', registro_id: mov.id, datos_nuevos: mov, usuario_id: req.usuario!.id });
    res.json(mov);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== REPORTE FISICO ========== */

app.get('/api/reporte/movimientos', verificarToken, async (req: Request, res: Response) => {
  try {
    const { proyectoId, desde, hasta } = req.query;
    const data = db.getReporteMovimientos(proyectoId ? Number(proyectoId) : null, desde as string | undefined, hasta as string | undefined);
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/api/reporte/movimientos/:proyectoId', verificarToken, async (req: Request, res: Response) => {
  try {
    const { proyectoId } = req.params;
    const { desde, hasta } = req.query;
    const data = db.getReporteMovimientos(Number(proyectoId), desde as string | undefined, hasta as string | undefined);
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

/* ========== SPA FALLBACK ========== */

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) { next(); return; }
  res.sendFile(join(staticDir, 'index.html'));
});

/* ========== INIT ========== */

async function init() {
  try {
    await db.initSchema();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al inicializar la base de datos:', (err as Error).message);
    process.exit(1);
  }
}

init();
