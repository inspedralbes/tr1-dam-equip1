// Un handler per a cada "type" de missatge que pot enviar el client.
// Validen el payload, criden la lògica del joc (game/) i fan el broadcast.
const RoomManager = require('../game/RoomManager');
const preguntesRepo = require('../data/preguntesRepo');
const { AppError } = require('../errors');
const { sendTo, broadcastRoom } = require('./broadcast');

function validarNom(name) {
  const nom = typeof name === 'string' ? name.trim() : '';
  if (nom.length < 1 || nom.length > 30) throw new AppError('INVALID_NAME', 'El nom ha de tenir entre 1 i 30 caràcters');
  return nom;
}

// El client ha d'estar dins d'una sala per a la majoria d'accions
function salaDelClient(ws) {
  if (!ws.roomCode) throw new AppError('NOT_IN_ROOM', 'Primer has d\'entrar a una sala');
  return RoomManager.getRoom(ws.roomCode);
}

function entrar(ws, room, name) {
  if (ws.roomCode) throw new AppError('ALREADY_IN_ROOM', 'Ja ets dins d\'una sala');
  const player = room.addPlayer(validarNom(name), ws);
  ws.roomCode = room.code;
  ws.playerId = player.id;

  sendTo(ws, 'ROOM_JOINED', { code: room.code, playerId: player.id, isHost: player.isHost, room: room.summary() });
  broadcastRoom(room, 'PLAYER_JOINED', { player: { id: player.id, name: player.name, isHost: player.isHost } }, { except: player.id });
  console.log(`[game][${room.code}] entra ${player.name} (#${player.id})`);
}

function tancarRonda(room) {
  const resultats = room.closeRound();
  if (!resultats) return; // ja s'havia tancat
  broadcastRoom(room, 'ROUND_RESULTS', resultats);
  console.log(`[game][${room.code}] ronda ${resultats.round} tancada`);
}

const handlers = {
  CREATE_ROOM(ws, { name, rounds }) {
    const numRounds = rounds === undefined ? undefined : Number(rounds);
    if (numRounds !== undefined && (!Number.isInteger(numRounds) || numRounds < 1 || numRounds > 20)) {
      throw new AppError('INVALID_ROUNDS', 'El nombre de rondes ha de ser entre 1 i 20');
    }
    validarNom(name); // validem abans de crear la sala
    const room = RoomManager.createRoom(numRounds);
    entrar(ws, room, name);
  },

  JOIN_ROOM(ws, { code, name }) {
    entrar(ws, RoomManager.getRoom(code), name);
  },

  async START_ROUND(ws) {
    const room = salaDelClient(ws);
    room.assertHost(ws.playerId);
    room.canStartRound();

    const pregunta = await preguntesRepo.preguntaAleatoria(room.usedQuestionIds);
    if (!pregunta) throw new AppError('NO_QUESTIONS', 'No queden preguntes a la base de dades');

    room.canStartRound(); // es torna a comprovar: mentre esperàvem la BD algú altre podria haver-la iniciat
    room.startRound(pregunta);
    broadcastRoom(room, 'ROUND_STARTED', room.publicQuestion());
    console.log(`[game][${room.code}] ronda ${room.roundNumber} iniciada (pregunta #${pregunta.id})`);
  },

  SUBMIT_ANSWER(ws, { value }) {
    const room = salaDelClient(ws);
    room.submitAnswer(ws.playerId, Number(value));

    sendTo(ws, 'ANSWER_ACCEPTED', { value: Number(value) });
    broadcastRoom(room, 'VOTE_STATUS', room.voteStatus());

    if (room.allAnswered()) tancarRonda(room); // tancament automàtic
  },

  CLOSE_ROUND(ws) {
    const room = salaDelClient(ws);
    room.assertHost(ws.playerId);
    if (room.state !== 'VOTING') throw new AppError('INVALID_STATE', 'No hi ha cap ronda oberta');
    tancarRonda(room);
  },

  END_GAME(ws) {
    const room = salaDelClient(ws);
    room.assertHost(ws.playerId);
    broadcastRoom(room, 'GAME_OVER', room.finish());
    console.log(`[game][${room.code}] partida acabada`);
  },
};

// Es crida quan es tanca el socket d'un jugador
function onDisconnect(ws) {
  if (!ws.roomCode) return;
  let room;
  try {
    room = RoomManager.getRoom(ws.roomCode);
  } catch {
    return; // la sala ja no existeix
  }

  const player = room.players.get(ws.playerId);
  const nouHost = room.disconnect(ws.playerId);
  console.log(`[game][${room.code}] surt ${player?.name} (#${ws.playerId})`);

  if (room.isEmpty()) return RoomManager.deleteRoom(room.code);

  broadcastRoom(room, 'PLAYER_LEFT', { playerId: ws.playerId, newHostId: nouHost?.id ?? null });

  // Si estàvem votant i ara ja han respost tots els que queden, es tanca la ronda
  if (room.state === 'VOTING') {
    broadcastRoom(room, 'VOTE_STATUS', room.voteStatus());
    if (room.allAnswered()) tancarRonda(room);
  }
}

module.exports = { handlers, onDisconnect };
