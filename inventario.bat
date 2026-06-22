@echo off
setlocal enabledelayedexpansion

set "DIR=%~dp0"
cd /d "%DIR%"

:: Build frontend if not exists
if not exist "client\dist\index.html" (
    echo Construyendo frontend...
    cd client
    call npx.cmd vite build
    if errorlevel 1 (
        echo Error al construir frontend
        pause
        exit /b 1
    )
    cd "%DIR%"
)

:: Try to use bundled .exe first, otherwise use tsx
set SERVER_CMD=node
set SERVER_ARGS=
if exist "dist\inventario-server.exe" (
    set "SERVER_CMD=dist\inventario-server.exe"
) else (
    if exist "server\node_modules\.bin\tsx.cmd" (
        set "SERVER_CMD=server\node_modules\.bin\tsx.cmd"
        set "SERVER_ARGS=server\src\index.ts"
    ) else (
        if exist "node_modules\.bin\tsx.cmd" (
            set "SERVER_CMD=node_modules\.bin\tsx.cmd"
            set "SERVER_ARGS=server\src\index.ts"
        )
    )
)

echo Iniciando servidor...
start "Inventario Server" "%SERVER_CMD%" %SERVER_ARGS%

:: Wait for server
echo Esperando servidor...
:waitloop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/api/ups >nul 2>&1
if errorlevel 1 goto waitloop

:: Open browser in app mode
echo Abriendo aplicacion...
set "APP_URL=http://localhost:3000"

:: Try Chrome app mode first
set "BROWSER="
for %%b in (chrome, msedge, firefox) do (
    where %%b >nul 2>&1 && set "BROWSER=%%b" && goto found
)
:found

if defined BROWSER (
    if "!BROWSER!"=="firefox" (
        start "" "!BROWSER!" --new-window --kiosk "!APP_URL!"
    ) else (
        start "" "!BROWSER!" --app="!APP_URL!" --no-first-run
    )
) else (
    start "" "!APP_URL!"
)

echo.
echo Aplicacion abierta. Cierra la ventana del navegador y luego presiona
echo cualquier tecla para detener el servidor.
pause

:: Kill server
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq Inventario Server" >nul 2>&1
taskkill /f /im "inventario-server.exe" >nul 2>&1

echo Servidor detenido.
