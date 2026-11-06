// Enviament de missatges. Tots els missatges tenen el mateix "sobre": { type, payload }.
const { OPEN } = require('ws');

function sendTo(ws, type, payload = {}) {
  if (ws && ws.readyState === OPEN) ws.send(JSON.stringify({ type, payload }));
}

// Envia NOMÉS als jugadors d'aquesta sala (mai a wss.clients: aïllament entre sales)
function broadcastRoom(room, type, payload = {}, { except } = {}) {
  for (const player of room.players.values()) {
    if (player.connected && player.id !== except) sendTo(player.ws, type, payload);
  }
}

module.exports = { sendTo, broadcastRoom };
