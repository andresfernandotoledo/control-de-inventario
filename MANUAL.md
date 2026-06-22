# Manual de Usuario — Sistema de Control de Inventario

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Interfaz Principal](#2-interfaz-principal)
3. [Dashboard](#3-dashboard)
4. [UPS](#4-ups)
5. [Herramientas](#5-herramientas)
6. [Proyectos](#6-proyectos)
7. [Movimientos](#7-movimientos)
8. [Perfil](#8-perfil)
9. [Modo Oscuro](#9-modo-oscuro)
10. [Exportación de Datos](#10-exportación-de-datos)
11. [Acciones de Administrador](#11-acciones-de-administrador)

---

## 1. Acceso al Sistema

### Iniciar la aplicación

- **Linux**: ejecutar `./inventario.sh` o dar doble clic en `inventario.desktop`
- **Windows**: ejecutar `inventario.bat` o `dist/inventario-server.exe`

La aplicación se abre en una ventana propia (sin barra de navegación). Si no se abre automáticamente, ir a `http://localhost:3000` en el navegador.

### Iniciar Sesión

| Campo | Valor |
|-------|-------|
| Email | `admin@inventario.com` |
| Contraseña | `admin123` |

Hacer clic en **"Iniciar Sesión"**.

### Cerrar Sesión

Hacer clic en **🚪 Cerrar Sesión** en el menú lateral.

---

## 2. Interfaz Principal

- **Menú lateral izquierdo**: navegación entre secciones.
- **Área principal**: contenido de la sección activa.

| Icono | Sección | Descripción |
|-------|---------|-------------|
| 🔋 | UPS | Gestión de unidades UPS |
| 🔧 | Herramientas | Gestión de herramientas |
| 📋 | Proyectos | Gestión de proyectos |
| 🔄 | Movimientos | Registro de movimientos |
| 👤 | Perfil | Cambio de contraseña |
| 🌙/☀️ | Modo Oscuro | Alternar tema |
| 🚪 | Cerrar Sesión | Salir del sistema |

---

## 3. Dashboard

Tarjetas de resumen: Total UPS, Total Herramientas, Proyectos Activos, Herramientas en Uso.

---

## 4. UPS

### Listado
Todos los campos: Serie, Modelo, Capacidad, Ubicación, Estado, Ingreso, Salida, Notas, Acciones.

### Buscar
Por serie, modelo o ubicación. Filtrar por estado.

### Crear
**"+ Nueva UPS"** → completar formulario → **"Crear UPS"**.

### Editar / Eliminar
Requiere contraseña de administrador.

### Estados

| Estado | Color | Descripción |
|--------|-------|-------------|
| Activa | 🟢 Verde | UPS operativa |
| Entrada | 🔵 Azul | Ingresada al sistema |
| Salida | 🟣 Violeta | Retirada |
| Mantenimiento | 🔷 Cian | En mantenimiento |
| Soporte Provisional | 🟪 Púrpura | Soporte temporal |
| Baja | 🔴 Rojo | Dada de baja |

### Gráficos
Distribución por estado, por modelo, ingresos por mes, top ubicaciones.

---

## 5. Herramientas

### Listado
Código, Nombre, Marca, Modelo, Ubicación, Estado, Adquisición, Notas, Acciones.

### Estados automáticos

| Estado | Lógica |
|--------|--------|
| ✅ Disponible | No asignada a ningún proyecto activo |
| 🔧 En Uso | Asignada a un proyecto abierto |
| ❌ Baja | Marcada manualmente como baja |

### Crear / Editar / Eliminar
Crear sin contraseña. Editar y eliminar requieren contraseña de administrador.

### Asignar a Proyecto
Botón **📋** → seleccionar proyecto → fecha de salida → **"Asignar"**.

### Historial
Botón **📜** para ver todos los movimientos de la herramienta.

---

## 6. Proyectos

### Crear
**"Nuevo Proyecto"** → nombre, ubicación, fechas, responsable, herramientas.

### Editar
**"Editar"** (no requiere contraseña).

### Cerrar
**"Cerrar"** → requiere contraseña admin → libera herramientas automáticamente.

### Eliminar
Requiere contraseña de administrador.

### Responsable
Editable sin contraseña (icono **✎**).

---

## 7. Movimientos

Listado de todas las salidas/entradas de herramientas. Filtrar por proyecto.

**Reporte Físico**: modal con todos los movimientos → botón **"Imprimir"**.

---

## 8. Perfil

**👤 Perfil** → Email y Rol (solo lectura). Cambiar contraseña con contraseña actual + nueva (mín. 6 caracteres).

---

## 9. Modo Oscuro

**🌙 Modo Oscuro** / **☀️ Modo Claro** en el menú lateral. Se guarda automáticamente.

---

## 10. Exportación de Datos

- **UPS**: Exportar Excel (.xlsx) y PDF
- **Herramientas**: Exportar Excel/CSV y PDF
- **Movimientos**: Reporte Físico imprimible

---

## 11. Acciones de Administrador

Requieren verificación de contraseña:

| Sección | Acción |
|---------|--------|
| UPS | Editar, Eliminar |
| Herramientas | Editar, Eliminar |
| Proyectos | Eliminar, Cerrar |

> El responsable del proyecto se cambia sin contraseña.

---

## Solución de Problemas

### La aplicación no abre
- Verificar que Node.js esté instalado: `node --version`
- Ejecutar `cd server && npm install` para instalar dependencias
- Si el puerto 3000 está ocupado, cerrar el programa anterior

### No puedo iniciar sesión
- Primera vez: `admin@inventario.com` / `admin123`
- Si ya se cambió la contraseña, usar la nueva

### Error de base de datos
- Eliminar `data/inventario.db` y reiniciar la app (se recrea automáticamente)
- El archivo está en la carpeta `data/` del proyecto

### La app no abre ventana
Se abre en el navegador por defecto. Si quieres ventana propia, instala Chrome o Edge y ejecuta `inventario.sh` / `inventario.bat`.

---

*Documentación generada el 21 de junio de 2026.*
