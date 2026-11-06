// Registre de totes les sales actives (Map en memoria).
const { Room } = require('./Room');
const { AppError } = require('../errors');
const config = require('../config');

const rooms = new Map(); // code -> Room

// Codi de 6 caràcters (com partides.codi CHAR(6)). Sense 0/O ni 1/I per evitar confusions.
const LLETRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generarCodi() {
  let codi;
  do {
    codi = Array.from({ length: 6 }, () => LLETRES[Math.floor(Math.random() * LLETRES.length)]).join('');
  } while (rooms.has(codi));
  return codi;
}

function createRoom(numRounds = config.game.defaultRounds) {
  const room = new Room(generarCodi(), numRounds);
  rooms.set(room.code, room);
  console.log(`[game][${room.code}] sala creada (${numRounds} rondes)`);
  return room;
}

function getRoom(code) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new AppError('ROOM_NOT_FOUND', 'No existeix cap sala amb aquest codi', 404);
  return room;
}

function deleteRoom(code) {
  rooms.delete(code);
  console.log(`[game][${code}] sala eliminada`);
}

function listRooms() {
  return [...rooms.values()].map((r) => r.summary());
}

module.exports = { createRoom, getRoom, deleteRoom, listRooms };
