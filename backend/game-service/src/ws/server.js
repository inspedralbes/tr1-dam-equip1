// Servidor WebSocket (llibreria ws) muntat sobre el MATEIX servidor HTTP que Express.
const { WebSocketServer } = require('ws');
const { handlers, onDisconnect } = require('./handlers');
const { sendTo } = require('./broadcast');
const config = require('../config');

function crearServidorWs(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return sendTo(ws, 'ERROR', { code: 'BAD_JSON', message: 'El missatge no és un JSON vàlid' });
      }

      const handler = handlers[msg?.type];
      if (!handler) {
        return sendTo(ws, 'ERROR', { code: 'UNKNOWN_TYPE', message: `Tipus de missatge desconegut: ${msg?.type}` });
      }

      try {
        await handler(ws, msg.payload || {});
      } catch (err) {
        if (err.code && err.httpStatus) {
          sendTo(ws, 'ERROR', { code: err.code, message: err.message }); // error controlat
        } else {
          console.error('[game] error inesperat:', err);
          sendTo(ws, 'ERROR', { code: 'INTERNAL', message: 'Error intern del servidor' });
        }
      }
    });

    ws.on('close', () => onDisconnect(ws));
  });

  // Heartbeat: si un client no respon al ping, el tanquem (detecta connexions mortes)
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, config.heartbeatMs);
  wss.on('close', () => clearInterval(interval));

  return wss;
}

module.exports = { crearServidorWs };
