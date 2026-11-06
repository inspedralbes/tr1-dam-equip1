FROM node:22-alpine

WORKDIR /app

# Primer només les dependències: si no canvia package.json, Docker reutilitza aquesta capa
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=3001
EXPOSE 3001

# Usuari sense privilegis (la imatge oficial ja el porta)
USER node

CMD ["node", "src/index.js"]
