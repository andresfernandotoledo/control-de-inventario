#!/bin/bash
# Configura la base de datos MySQL para el sistema de inventario
# Ejecutar como: sudo bash setup-db.sh

DB_NAME="inventario_db"
DB_USER="inventario"
DB_PASS="Inventario2026!"

echo "================================================"
echo "  Configurando base de datos MySQL..."
echo "================================================"
echo ""

# Crear base de datos
mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Error: No se pudo conectar a MySQL."
  echo "Asegúrate de que MySQL/MariaDB esté corriendo:"
  echo "  sudo systemctl start mysql"
  echo ""
  echo "O intenta con:"
  echo "  mysql -u root -p"
  exit 1
fi

# Crear usuario y asignar permisos
mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "✅ Base de datos creada: $DB_NAME"
echo "✅ Usuario creado: $DB_USER"
echo ""
echo "================================================"
echo "  ¡Listo! Ahora ejecutá:"
echo "    npm start"
echo "================================================"
