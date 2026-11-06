// Punt d'entrada: Express (REST) + ws (WebSocket) sobre el mateix port.
const http = require('http');
const express = require('express');
const config = require('./config');
const routes = require('./rest/routes');
const { crearServidorWs } = require('./ws/server');

const app = express();
app.use(express.json());

// CORS bàsic per al desenvolupament (Vite a :5173). En producció tot passarà per Nginx.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use('/api', routes);

// Ruta inexistent
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no trobada' } });
});

// Middleware d'errors: tradueix AppError a { error: { code, message } }
app.use((err, req, res, next) => {
  if (err.code && err.httpStatus) {
    return res.status(err.httpStatus).json({ error: { code: err.code, message: err.message } });
  }
  console.error('[game] error inesperat:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Error intern del servidor' } });
});

const server = http.createServer(app);
crearServidorWs(server);

server.listen(config.port, () => {
  console.log(`[game] escoltant a http://localhost:${config.port} (REST /api, WebSocket /ws)`);
});

process.on('unhandledRejection', (err) => console.error('[game] promesa no gestionada:', err));
