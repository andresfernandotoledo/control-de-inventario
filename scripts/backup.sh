#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="$DIR/data/inventario.db"
BACKUP_DIR="$DIR/data/backups"
RCLONE_REMOTE="${RCLONE_REMOTE:-"backup:inventario"}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

# Copia local con timestamp
cp "$DB" "$BACKUP_DIR/inventario_$TIMESTAMP.db"

# Limpia backups viejos (más de 30 días)
find "$BACKUP_DIR" -name "inventario_*.db" -mtime +30 -delete 2>/dev/null || true

# Subir a cloud si rclone está configurado
if command -v rclone &> /dev/null; then
  if rclone config show "$(echo "$RCLONE_REMOTE" | cut -d: -f1)" &> /dev/null; then
    rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" --progress --backup-dir "$RCLONE_REMOTE-historial" 2>&1
    echo "Backup subido a rclone: $RCLONE_REMOTE"
  else
    echo "rclone remote '$RCLONE_REMOTE' no configurado. Sólo backup local."
  fi
else
  echo "rclone no instalado. Sólo backup local en $BACKUP_DIR"
fi

echo "Backup completado: $BACKUP_DIR/inventario_$TIMESTAMP.db"
