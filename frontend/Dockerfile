FROM node:18-alpine

WORKDIR /app

# Copiamos package.json primero para aprovechar la caché de Docker
COPY package.json .

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Vite
EXPOSE 5173

# Arrancamos en modo desarrollo
CMD ["npm", "run", "dev"]