import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import * as db from './database.js';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        nombre: string;
        email: string;
        rol: string;
        created_at?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'ups-inventario-secret-change-in-production';

export function generarToken(usuario: { id: number; email: string; rol: string }): string {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function verificarToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as { id: number; email: string; rol: string };
    const usuario = db.findUserById(decoded.id);
    if (!usuario) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }
    req.usuario = usuario;
    next();
  } catch (err) {
    if ((err as Error).name === 'JsonWebTokenError' || (err as Error).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
}

export function soloAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.usuario?.rol !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol de administrador' });
    return;
  }
  next();
}

export { JWT_SECRET };
