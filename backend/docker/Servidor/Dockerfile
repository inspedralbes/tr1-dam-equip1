FROM node:22-alpine

WORKDIR /app

# primer només el package.json, així docker reaprofita la capa si no canvien les dependències
COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY ws ./ws

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "index.js"]
