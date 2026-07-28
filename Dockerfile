# =============================================================================
#  Brain Viz — imagen de PRODUCCIÓN (un único contenedor)
# =============================================================================
#  Para desarrollo se emplea docker-compose.yml, que levanta el backend y el
#  frontend por separado con recarga en caliente. Para el despliegue en un
#  servidor público interesa lo contrario: un solo contenedor autocontenido.
#
#  Se construye en dos etapas:
#    1. Se compila la aplicación de React a ficheros estáticos.
#    2. Se copian esos ficheros a la imagen de Python, donde Flask los sirve
#       junto con la API. Así no hace falta ningún proxy entre servicios.
# =============================================================================

# --- Etapa 1: compilación del frontend ---------------------------------------
FROM node:18-alpine AS frontend-build

WORKDIR /build

# Primero las dependencias, para aprovechar la caché de Docker
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Después el código y la compilación
COPY frontend/ ./
RUN npm run build


# --- Etapa 2: imagen final con el backend y los estáticos --------------------
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependencias de Python (incluye gunicorn, servidor WSGI de producción)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código del backend y datos de las redes
COPY backend/src/ ./src/
COPY backend/data/ ./data/

# Ficheros estáticos generados en la etapa anterior
COPY --from=frontend-build /build/dist ./static

# Render (y otras plataformas) inyectan el puerto en la variable PORT
ENV PORT=8080
EXPOSE 8080

# Servidor de producción: sin modo depuración y escuchando en todas las
# interfaces. `sh -c` permite expandir la variable $PORT.
CMD ["sh", "-c", "gunicorn --chdir src --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 120 app:app"]
