# Usamos una imagen ligera de Python
FROM python:3.9-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los requisitos e instalamos dependencias
# (Hacemos esto antes de copiar el código para aprovechar la caché de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Exponemos el puerto 5000
EXPOSE 5000

# Variable de entorno para que Python no genere archivos .pyc
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Comando por defecto al levantar el contenedor (modo desarrollo)
CMD ["python", "src/app.py"]