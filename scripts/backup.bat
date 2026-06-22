@echo off
setlocal enabledelayedexpansion

set "DIR=%~dp0.."
set "DB=%DIR%\data\inventario.db"
set "BACKUP_DIR=%DIR%\data\backups"
set "RCLONE_REMOTE=%RCLONE_REMOTE%"
if "%RCLONE_REMOTE%"=="" set "RCLONE_REMOTE=backup:inventario"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set "TIMESTAMP=%DATE:/=-%_%TIME::=-%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "TIMESTAMP=%TIMESTAMP:.=%"
set "BACKUP_FILE=%BACKUP_DIR%\inventario_%TIMESTAMP%.db"

copy "%DB%" "%BACKUP_FILE%" >nul
echo Backup local: %BACKUP_FILE%

:: Limpiar backups viejos (+30 dias)
forfiles /p "%BACKUP_DIR%" /m inventario_*.db /d -30 /c "cmd /c del @path" 2>nul

:: Subir con rclone si esta instalado
where rclone >nul 2>&1
if %errorlevel% equ 0 (
    rclone copy "%BACKUP_DIR%" "%RCLONE_REMOTE%" --backup-dir "%RCLONE_REMOTE%-historial" 2>&1
    if !errorlevel! equ 0 (
        echo Backup subido a rclone: %RCLONE_REMOTE%
    ) else (
        echo Error al subir a rclone
    )
) else (
    echo rclone no instalado. Solo backup local.
)

echo Backup completado.
