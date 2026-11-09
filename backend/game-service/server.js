// servidor del how much live
// express (api) i ws (joc) van pel mateix port, les sales es guarden en memoria

const http = require('http');
const express = require('express');
const mysql = require('mysql2/promise');
const { WebSocketServer, OPEN } = require('ws');

const PORT = Number(process.env.PORT) || 3001;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'nodeuser',
  password: process.env.DB_PASSWORD || 'nodepass',
  database: process.env.DB_NAME || 'howmuch_live',
  charset: 'utf8mb4',
});

// errors que si que li podem dir al client, la resta surten com INTERNAL
class ErrorJoc extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------- sales ----------

const rooms = new Map();
const LLETRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sense 0/O ni 1/I que es lien

function crearSala(rondes) {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += LLETRES[Math.floor(Math.random() * LLETRES.length)];
  } while (rooms.has(code));

  const room = {
    code,
    state: 'LOBBY', // LOBBY, VOTING, RESULTS o FINISHED
    totalRounds: rondes,
    round: 0,
    players: new Map(),
    nextId: 1,
    question: null, // porta la resposta, no enviar mai als clients!!
    slider: null,
    answers: new Map(),
    usedIds: [],
  };
  rooms.set(code, room);
  console.log(`[game][${code}] sala creada (${rondes} rondes)`);
  return room;
}

function buscarSala(code) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new ErrorJoc('ROOM_NOT_FOUND', 'No existeix cap sala amb aquest codi');
  return room;
}

function connectats(room) {
  return [...room.players.values()].filter((p) => p.connected);
}

function totsHanRespost(room) {
  return connectats(room).every((p) => room.answers.has(p.id));
}

function resumSala(room) {
  return {
    code: room.code,
    state: room.state,
    round: room.round,
    totalRounds: room.totalRounds,
    players: [...room.players.values()].map(({ id, name, isHost, connected, score }) => ({ id, name, isHost, connected, score })),
  };
}

function classificacio(room) {
  return [...room.players.values()]
    .map((p) => ({ playerId: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function votsActuals(room) {
  return { answered: [...room.answers.keys()], total: connectats(room).length };
}

// ---------- regles del joc ----------

// el rang es random perque si no la resposta seria sempre al mig del slider
function ferSlider(correcta) {
  const ample = Math.max(Math.abs(correcta) * (0.8 + Math.random() * 1.7), 20);
  const pos = 0.1 + Math.random() * 0.8;
  let min = Math.floor(correcta - ample * pos);
  const max = Math.ceil(correcta + ample * (1 - pos));
  if (correcta >= 0 && min < 0) min = 0;
  return { min, max, step: 1 };
}

// 1r 3 punts, 2n 2, 3r 1, i +2 si l'encertes exacte
// si hi ha empat comparteixen posicio
function puntuar(correcta, respostes) {
  const PUNTS = { 1: 3, 2: 2, 3: 1 };
  const ambDiff = respostes.map((r) => ({ ...r, diff: Math.abs(r.value - correcta) }));
  return ambDiff
    .map((r) => {
      const position = 1 + ambDiff.filter((o) => o.diff < r.diff).length;
      const points = (PUNTS[position] || 0) + (r.diff === 0 ? 2 : 0);
      return { ...r, position, points };
    })
    .sort((a, b) => a.position - b.position);
}

function tancarRonda(room) {
  if (room.state !== 'VOTING') return;
  room.state = 'RESULTS';

  const respostes = [...room.answers].map(([playerId, value]) => ({ playerId, value }));
  const resultats = puntuar(room.question.resposta_correcta, respostes);
  for (const r of resultats) room.players.get(r.playerId).score += r.points;

  const senseResposta = [...room.players.values()]
    .filter((p) => !room.answers.has(p.id))
    .map((p) => ({ playerId: p.id, name: p.name, value: null, diff: null, position: null, points: 0 }));

  broadcast(room, 'ROUND_RESULTS', {
    round: room.round,
    correctAnswer: room.question.resposta_correcta,
    results: [...resultats.map((r) => ({ ...r, name: room.players.get(r.playerId).name })), ...senseResposta],
    leaderboard: classificacio(room),
    isLastRound: room.round >= room.totalRounds,
  });
  console.log(`[game][${room.code}] ronda ${room.round} tancada`);
}

// ---------- enviar missatges ----------

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === OPEN) ws.send(JSON.stringify({ type, payload }));
}

// nomes als de la sala, mai a tots els clients
function broadcast(room, type, payload = {}, exceptId) {
  for (const p of room.players.values()) {
    if (p.connected && p.id !== exceptId) send(p.ws, type, payload);
  }
}

// ---------- missatges del client ----------

function validarNom(name) {
  const nom = typeof name === 'string' ? name.trim() : '';
  if (nom.length < 1 || nom.length > 30) throw new ErrorJoc('INVALID_NAME', 'El nom ha de tenir entre 1 i 30 caràcters');
  return nom;
}

function noEstarEnSala(ws) {
  if (ws.roomCode) throw new ErrorJoc('ALREADY_IN_ROOM', "Ja ets dins d'una sala");
}

function salaDelClient(ws) {
  if (!ws.roomCode) throw new ErrorJoc('NOT_IN_ROOM', "Primer has d'entrar a una sala");
  return buscarSala(ws.roomCode);
}

function nomesHost(room, ws) {
  if (!room.players.get(ws.playerId).isHost) throw new ErrorJoc('NOT_HOST', "Només l'amfitrió pot fer això");
}

function esPotComencar(room) {
  if (room.state !== 'LOBBY' && room.state !== 'RESULTS') {
    throw new ErrorJoc('INVALID_STATE', `No es pot iniciar una ronda en l'estat ${room.state}`);
  }
  if (room.round >= room.totalRounds) throw new ErrorJoc('NO_MORE_ROUNDS', 'Ja no queden rondes');
}

function entrar(ws, room, name) {
  const nom = validarNom(name);
  if (room.state !== 'LOBBY') throw new ErrorJoc('GAME_ALREADY_STARTED', 'La partida ja ha començat');
  const repetit = [...room.players.values()].some((p) => p.name.toLowerCase() === nom.toLowerCase());
  if (repetit) throw new ErrorJoc('NAME_TAKEN', 'Aquest nom ja és a la sala');

  // el primer que entra es l'amfitrio
  const player = { id: room.nextId++, name: nom, isHost: room.players.size === 0, connected: true, score: 0, ws };
  room.players.set(player.id, player);
  ws.roomCode = room.code;
  ws.playerId = player.id;

  send(ws, 'ROOM_JOINED', { code: room.code, playerId: player.id, isHost: player.isHost, room: resumSala(room) });
  broadcast(room, 'PLAYER_JOINED', { player: { id: player.id, name: player.name, isHost: player.isHost } }, player.id);
  console.log(`[game][${room.code}] entra ${player.name} (#${player.id})`);
}

const handlers = {
  CREATE_ROOM(ws, { name, rounds = 5 }) {
    const numRounds = Number(rounds);
    if (!Number.isInteger(numRounds) || numRounds < 1 || numRounds > 20) {
      throw new ErrorJoc('INVALID_ROUNDS', 'El nombre de rondes ha de ser entre 1 i 20');
    }
    validarNom(name);
    noEstarEnSala(ws);
    entrar(ws, crearSala(numRounds), name);
  },

  JOIN_ROOM(ws, { code, name }) {
    const room = buscarSala(code);
    noEstarEnSala(ws);
    entrar(ws, room, name);
  },

  async START_ROUND(ws) {
    const room = salaDelClient(ws);
    nomesHost(room, ws);
    esPotComencar(room);

    const excloure = room.usedIds.length ? room.usedIds : [0];
    const [rows] = await pool.execute(
      `SELECT p.id, p.enunciat, p.resposta_correcta, c.nom AS categoria
         FROM preguntes p JOIN categories c ON c.id = p.categoria_id
        WHERE p.id NOT IN (${excloure.map(() => '?').join(',')})
        ORDER BY RAND() LIMIT 1`,
      excloure
    );
    const pregunta = rows[0];
    if (!pregunta) throw new ErrorJoc('NO_QUESTIONS', 'No queden preguntes a la base de dades');

    // es mira un altre cop per si fan doble click mentre esperem la bd
    esPotComencar(room);

    room.round++;
    room.state = 'VOTING';
    room.question = pregunta;
    room.slider = ferSlider(pregunta.resposta_correcta);
    room.answers.clear();
    room.usedIds.push(pregunta.id);

    broadcast(room, 'ROUND_STARTED', {
      round: room.round,
      totalRounds: room.totalRounds,
      question: { id: pregunta.id, text: pregunta.enunciat, category: pregunta.categoria },
      slider: room.slider,
    });
    console.log(`[game][${room.code}] ronda ${room.round} iniciada (pregunta #${pregunta.id})`);
  },

  SUBMIT_ANSWER(ws, { value }) {
    const room = salaDelClient(ws);
    const num = Number(value);
    if (room.state !== 'VOTING') throw new ErrorJoc('INVALID_STATE', 'No hi ha cap ronda oberta');
    if (room.answers.has(ws.playerId)) throw new ErrorJoc('ALREADY_ANSWERED', 'Ja has respost aquesta ronda');
    if (!Number.isInteger(num)) throw new ErrorJoc('INVALID_VALUE', 'La resposta ha de ser un nombre enter');
    if (num < room.slider.min || num > room.slider.max) {
      throw new ErrorJoc('INVALID_VALUE', `La resposta ha d'estar entre ${room.slider.min} i ${room.slider.max}`);
    }
    room.answers.set(ws.playerId, num);

    send(ws, 'ANSWER_ACCEPTED', { value: num });
    broadcast(room, 'VOTE_STATUS', votsActuals(room));
    if (totsHanRespost(room)) tancarRonda(room);
  },

  CLOSE_ROUND(ws) {
    const room = salaDelClient(ws);
    nomesHost(room, ws);
    if (room.state !== 'VOTING') throw new ErrorJoc('INVALID_STATE', 'No hi ha cap ronda oberta');
    tancarRonda(room);
  },

  END_GAME(ws) {
    const room = salaDelClient(ws);
    nomesHost(room, ws);
    room.state = 'FINISHED';
    broadcast(room, 'GAME_OVER', { leaderboard: classificacio(room) });
    console.log(`[game][${room.code}] partida acabada`);
  },
};

function onDesconnexio(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;

  const player = room.players.get(ws.playerId);
  player.connected = false;
  player.ws = null;
  // al lobby simplement desapareix, durant la partida es queda a la classificacio
  if (room.state === 'LOBBY') room.players.delete(player.id);
  console.log(`[game][${room.code}] surt ${player.name} (#${player.id})`);

  let nouHost = null;
  if (player.isHost) {
    player.isHost = false;
    nouHost = connectats(room)[0] || null;
    if (nouHost) nouHost.isHost = true;
  }

  if (connectats(room).length === 0) {
    rooms.delete(room.code);
    console.log(`[game][${room.code}] sala eliminada`);
    return;
  }

  broadcast(room, 'PLAYER_LEFT', { playerId: player.id, newHostId: nouHost ? nouHost.id : null });

  // si marxa l'unic que faltava per votar es tanca la ronda
  if (room.state === 'VOTING') {
    broadcast(room, 'VOTE_STATUS', votsActuals(room));
    if (totsHanRespost(room)) tancarRonda(room);
  }
}

// ---------- api rest ----------

const app = express();
app.use(express.json());

// cors per poder provar des de vite
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// el healthcheck del docker tira d'aquesta
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nom FROM categories ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('[game] error inesperat:', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Error intern del servidor' } });
  }
});

app.get('/api/rooms', (req, res) => {
  res.json([...rooms.values()].map(resumSala));
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: { code: 'ROOM_NOT_FOUND', message: 'No existeix cap sala amb aquest codi' } });
  res.json(resumSala(room));
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no trobada' } });
});

// ---------- websocket ----------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => onDesconnexio(ws));

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(ws, 'ERROR', { code: 'BAD_JSON', message: 'El missatge no és un JSON vàlid' });
    }

    const type = msg && msg.type;
    if (!Object.hasOwn(handlers, type)) {
      return send(ws, 'ERROR', { code: 'UNKNOWN_TYPE', message: `Tipus de missatge desconegut: ${type}` });
    }

    try {
      await handlers[type](ws, msg.payload || {});
    } catch (err) {
      if (err instanceof ErrorJoc) return send(ws, 'ERROR', { code: err.code, message: err.message });
      console.error('[game] error inesperat:', err);
      send(ws, 'ERROR', { code: 'INTERNAL', message: 'Error intern del servidor' });
    }
  });
});

// cada 30s ping, si algu no ha contestat el tirem (si no es queda la ronda penjada)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`[game] escoltant a http://localhost:${PORT} (REST /api, WebSocket /ws)`);
});
