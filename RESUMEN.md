# Sistema de Control de Inventario - Resumen

## Stack
- **Backend:** Node.js + Express (servidor en puerto 3000)
- **Base de datos:** MySQL v8+ en localhost:3306
- **Frontend:** HTML + CSS + JS vanilla (SPA)

## Base de datos: `inventario_db`
- **Usuario:** `inventario` / `Inventario2026!`
- **5 tablas:**
  - `usuarios` — login, roles (admin/operador)
  - `herramientas` — catálogo con código, nombre, marca, modelo, ubicación, estado
  - `proyectos` — proyectos/obras donde se prestan herramientas
  - `movimientos_herramientas` — registro de préstamos y devoluciones
  - `auditoria` — log de cada acción (INSERT, UPDATE, DELETE)

## Estados de herramienta
`disponible`, `prestada`, `mantenimiento`, `baja`
Seleccionable directamente desde la tabla (dropdown inline).

## Funcionalidades
1. **Login** — JWT con roles admin/operador (admin por defecto)
2. **CRUD herramientas** — crear, editar, eliminar, cambio rápido de estado
3. **CRUD proyectos** — crear, editar, eliminar
4. **Préstamos** — asignar herramienta a proyecto (salida) y registrar devolución (entrada)
5. **Filtros** — por texto (buscar) y por estado (disponible/prestada/etc.)
6. **Notificaciones** — toasts de éxito/error
7. **Auditoría** — registro automático de cada operación

## Archivos clave
```
server.js          → Express API (rutas + JWT + middlewares)
database.js        → queries MySQL (pool + funciones CRUD)
create_db.sql      → schema SQL para crear la BD
public/
  index.html       → SPA
  styles.css       → estilos
  app.js           → lógica del frontend
RESUMEN.md         ← este archivo
```

## Cómo correr
```bash
node server.js
# Abrir http://localhost:3000
# Login: admin@inventario.com / admin123
```
