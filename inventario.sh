#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

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

# Esperar servidor
echo "Esperando servidor..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/api/ups > /dev/null 2>&1; then break; fi
  sleep 1
done

echo "Abriendo aplicación..."
if command -v google-chrome &> /dev/null; then
  google-chrome --app=http://localhost:3000 --no-first-run &
elif command -v chromium-browser &> /dev/null; then
  chromium-browser --app=http://localhost:3000 --no-first-run &
elif command -v firefox &> /dev/null; then
  firefox --new-window --kiosk http://localhost:3000 &
else
  xdg-open http://localhost:3000
fi

wait $!
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
