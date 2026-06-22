# Sistema de Control de Inventario

Aplicación de escritorio para gestión de inventario de UPS, herramientas, proyectos y movimientos. React + TypeScript (frontend), Node.js + Express (backend), SQLite embebido (sin servidor MySQL).

## Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite 6, Chart.js 4
- **Backend**: Node.js, Express 5, TypeScript (ESM)
- **Base de Datos**: SQLite via sql.js (archivo local, sin servidor)
- **Autenticación**: JWT + bcryptjs
- **Exportación**: ExcelJS (.xlsx)

## Requisitos

- **Node.js** 18 o superior
- **npm** 9+
- **Chrome** o **Edge** o **Firefox** (para modo app, opcional)

## Instalación

```bash
cd server
npm install
cd ../client
npm install
cd ..
```

## Ejecución

### Escritorio (ventana propia, sin navegador)

```bash
./inventario.sh
```

O doble clic en `inventario.sh` (Linux) o `inventario.bat` (Windows).

Abre Chrome/Edge/Firefox en modo aplicación (sin URL bar, sin pestañas).

### Desarrollo

```bash
# Terminal 1: servidor
cd server && npm run dev

# Terminal 2: frontend (opcional, hot reload)
cd client && npx vite
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

### Como ejecutable Windows (.exe)

En una máquina Windows con Node.js:

```bash
npm run build:exe
```

Genera `dist/inventario-server.exe` (servidor + frontend embebido). Ejecutar el .exe directamente.

## Base de Datos

SQLite embebido. El archivo `data/inventario.db` se crea automáticamente al iniciar el servidor. No requiere MySQL ni configuración.

## Credenciales por Defecto

| Rol    | Email                 | Contraseña |
|--------|-----------------------|------------|
| Admin  | admin@inventario.com  | admin123   |

## Estructura del Proyecto

```
├── client/               # Frontend React + Vite
│   ├── src/              # Código fuente
│   └── public/           # Iconos (favicon.svg, favicon.ico)
├── server/               # Backend Express + TypeScript
│   └── src/              # Código fuente
├── electron/             # Wrapper Electron (opcional)
├── scripts/              # Scripts de build
├── data/                 # Base de datos SQLite (auto-creada)
├── inventario.sh         # Lanzador Linux
├── inventario.bat        # Lanzador Windows
└── inventario.desktop    # Acceso directo escritorio Linux
```

## Funcionalidades

### UPS
- CRUD completo de unidades UPS
- 6 estados: Activa, Entrada, Salida, Mantenimiento, Soporte Provisional, Baja
- Dashboard con gráficos
- Exportación a Excel

### Herramientas
- CRUD completo
- Estados automáticos según asignación a proyectos
- Asignación/desasignación a proyectos
- Historial de movimientos por herramienta

### Proyectos
- CRUD completo
- Asignación masiva de herramientas
- Cierre automático que libera herramientas
- Responsable editable sin contraseña

### Movimientos
- Registro de salida y entrada de herramientas
- Reporte físico imprimible

### General
- Autenticación JWT (8h)
- Roles: admin y usuario
- Modo oscuro persistente
- Sidebar responsive
- Exportación Excel
- Auditoría de cambios
