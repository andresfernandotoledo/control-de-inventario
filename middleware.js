const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'ups-inventario-secret-change-in-production';

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const usuario = await db.findUserById(decoded.id);
    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    return res.status(500).json({ error: 'Error del servidor' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  next();
}

module.exports = { generarToken, verificarToken, soloAdmin, JWT_SECRET };
