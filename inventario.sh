#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== Control de Inventario ==="

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js no está instalado. Instálalo desde https://nodejs.org"
  exit 1
fi

# Verificar dependencias
if [ ! -d "server/node_modules" ]; then
  echo "Instalando dependencias del servidor..."
  cd server && npm install && cd "$DIR"
fi

if [ ! -d "client/node_modules" ]; then
  echo "Instalando dependencias del cliente..."
  cd client && npm install && cd "$DIR"
fi

# Build cliente si no existe
if [ ! -d "client/dist" ]; then
  echo "Construyendo frontend..."
  cd client && npx vite build && cd "$DIR"
fi

# Iniciar servidor
cd server
echo "Iniciando servidor..."
npx tsx src/index.ts &
SERVER_PID=$!
cd "$DIR"

# Esperar servidor (hasta 30 seg)
echo "Esperando servidor..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/api/ups > /dev/null 2>&1; then
    echo "Servidor listo."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: El servidor no respondió después de 30 segundos."
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# Abrir navegador
echo "Abriendo aplicación..."
if command -v google-chrome &> /dev/null; then
  google-chrome --app=http://localhost:3000 --no-first-run &>/dev/null &
elif command -v chromium-browser &> /dev/null; then
  chromium-browser --app=http://localhost:3000 --no-first-run &>/dev/null &
elif command -v firefox &> /dev/null; then
  firefox --new-window http://localhost:3000 &>/dev/null &
else
  xdg-open http://localhost:3000 &>/dev/null &
fi

BROWSER_PID=$!

# Esperar a que cierren el navegador
wait $BROWSER_PID 2>/dev/null

# Limpiar
echo "Deteniendo servidor..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "Aplicación cerrada."
