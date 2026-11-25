FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY ws ./ws
COPY db ./db

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "index.js"]
