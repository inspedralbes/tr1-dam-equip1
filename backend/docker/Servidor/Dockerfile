# El context del build és l'arrel del repo (veure docker-compose.yml)

# 1. Compilem el frontend de Vue
FROM node:22-alpine AS frontend

WORKDIR /frontend

COPY frontend/HowMuchLive/package*.json ./
RUN npm ci

COPY frontend/HowMuchLive ./
ENV VITE_BASE=/howmuch/
RUN npm run build

# 2. Servidor Node, que també serveix el dist compilat
FROM node:22-alpine

WORKDIR /app

COPY backend/docker/Servidor/package*.json ./
RUN npm ci --omit=dev

COPY backend/docker/Servidor/index.js ./
COPY backend/docker/Servidor/ws ./ws
COPY backend/docker/Servidor/db ./db
COPY --from=frontend /frontend/dist ./public

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "index.js"]
