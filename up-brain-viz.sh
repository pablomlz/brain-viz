#!/bin/bash
# Script para levantar docker compose y mostrar los puertos asignados automáticamente

docker compose up --build &
DC_PID=$!

# Espera a que los servicios estén arriba (puedes ajustar el tiempo si hace falta)
sleep 5

# Extrae los puertos publicados
BACKEND_PORT=$(docker compose ps | grep backend | grep -oE '[0-9]+->5000' | head -1 | cut -d'-' -f1)
FRONTEND_PORT=$(docker compose ps | grep frontend | grep -oE '[0-9]+->5173' | head -1 | cut -d'-' -f1)

printf "\n🚀 Backend:   http://localhost:%s/health\n" "$BACKEND_PORT"
printf "🚀 Frontend:  http://localhost:%s\n" "$FRONTEND_PORT"

wait $DC_PID
