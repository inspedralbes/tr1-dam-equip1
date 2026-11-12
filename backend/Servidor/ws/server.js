import { WebSocketServer, WebSocket } from "ws";

const rooms = new Map();
let nextClientId = 1;
let wss;

// Llista senzilla de preguntes per a la mecànica del joc
const questions = [
  {
    text: "Quants quilòmetres de vasos sanguinis hi ha al cos humà?",
    answer: 100000,
  },
  {
    text: "Quantes formigues hi ha al món (en milers de milions)?",
    answer: 20000000,
  },
  { text: "Quantes finestres té l'Empire State Building?", answer: 6500 },
  {
    text: "Quants quilòmetres mesura aproximadament l'equador terrestre?",
    answer: 40075,
  },
  { text: "Quants metres d'alçada fa l'Everest?", answer: 8849 },
  { text: "Quants ossos té el cos humà d'un adult?", answer: 206 },
  {
    text: "Quants països hi ha actualment al món reconeguts per l'ONU?",
    answer: 193,
  },
];

export function setupWebSocket(server) {
  wss = server
    ? new WebSocketServer({ server })
    : new WebSocketServer({ port: 3000 });

  wss.on("connection", (ws) => {
    ws.id = nextClientId++;
    ws.roomId = null;
    ws.name = null;
    ws.isHost = false;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        console.error("Format JSON no vàlid");
        return;
      }

      // 1. CREAR SALA
      if (msg.type === "createRoom") {
        leaveRoom(ws);

        const roomId = Math.floor(1000 + Math.random() * 9000);
        ws.roomId = roomId;
        ws.name = msg.name;
        ws.isHost = true;

        const room = {
          id: roomId,
          hostId: ws.id,
          state: "LOBBY",
          players: [{ id: ws.id, name: ws.name, score: 0 }],
          round: 0,
          currentQuestion: null,
          answers: {},
        };
        rooms.set(roomId, room);

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomId: roomId,
            isHost: true,
            players: room.players,
          }),
        );
        console.log(`Sala ${roomId} creada per ${ws.name} (${ws.id})`);
      }

      // 2. UNIR-SE A UNA SALA
      if (msg.type === "joinRoom") {
        const roomId = Number(msg.roomId || msg.code);
        const room = rooms.get(roomId);

        if (!room) {
          ws.send(
            JSON.stringify({ type: "error", message: "La sala no existeix" }),
          );
          return;
        }

        if (ws.roomId && ws.roomId !== roomId) {
          leaveRoom(ws);
        }

        ws.roomId = roomId;
        ws.name = msg.name || `Jugador ${ws.id}`;
        ws.isHost = room.hostId === ws.id;

        if (!room.players.some((p) => p.id === ws.id)) {
          room.players.push({ id: ws.id, name: ws.name, score: 0 });
        }

        ws.send(
          JSON.stringify({
            type: "roomJoined",
            roomId: roomId,
            isHost: ws.isHost,
            players: room.players,
          }),
        );

        broadcastToRoom(
          roomId,
          JSON.stringify({
            type: "playerJoined",
            player: { id: ws.id, name: ws.name, score: 0 },
            players: room.players,
          }),
        );

        console.log(`Cliente ${ws.id} (${ws.name}) se unió a sala ${roomId}`);
      }

      // 3. INICIAR RONDA (Només l'amfitrió)
      if (msg.type === "startRound") {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        if (room.hostId !== ws.id) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Només l'amfitrió pot iniciar la ronda",
            }),
          );
          return;
        }

        room.round++;
        room.state = "VOTING";
        room.answers = {};

        const qIndex = (room.round - 1) % questions.length;
        room.currentQuestion = questions[qIndex];

        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "roundStarted",
            round: room.round,
            question: room.currentQuestion.text,
            totalPlayers: room.players.length,
          }),
        );
        console.log(`Ronda ${room.round} iniciada a sala ${ws.roomId}`);
      }

      // 4. ENVIAR RESPOSTA (Estimació numèrica)
      if (msg.type === "submitAnswer") {
        const room = rooms.get(ws.roomId);
        if (!room || room.state !== "VOTING") return;

        const val = Number(msg.answer ?? msg.estimate ?? msg.value);
        if (isNaN(val)) return;

        if (room.answers[ws.id] !== undefined) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Ja has respost aquesta ronda",
            }),
          );
          return;
        }

        room.answers[ws.id] = val;

        // Notifiquem a tots qui ha votat (sense revelar la resposta)
        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "playerVoted",
            id: ws.id,
            name: ws.name,
            votedCount: Object.keys(room.answers).length,
            totalPlayers: room.players.length,
          }),
        );

        // Si tots han votat, tanquem ronda automàticament
        if (Object.keys(room.answers).length >= room.players.length) {
          finishRound(room);
        }
      }

      // 5. TANCAR RONDA MANUALMENT (Amfitrió)
      if (msg.type === "endRound") {
        const room = rooms.get(ws.roomId);
        if (room && room.hostId === ws.id) {
          finishRound(room);
        }
      }

      // 6. XAT
      if (msg.type === "chat") {
        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "chat",
            from: ws.name || ws.id,
            text: msg.text,
          }),
        );
      }
    });

    ws.on("close", () => {
      leaveRoom(ws);
      console.log(`Client ${ws.id} Desconectat`);
    });
  });

  return wss;
}

function finishRound(room) {
  if (room.state !== "VOTING") return;
  room.state = "RESULTS";

  const correct = room.currentQuestion.answer;
  const results = [];

  for (const p of room.players) {
    const ans = room.answers[p.id];
    const answered = ans !== undefined;
    const diff = answered ? Math.abs(ans - correct) : Infinity;

    results.push({
      id: p.id,
      name: p.name,
      estimate: answered ? ans : null,
      diff: diff,
      roundPoints: 0,
    });
  }

  // Ordenem de menor diferència a major
  results.sort((a, b) => a.diff - b.diff);

  // Calcular punts segons posició i empats (1r: 3pts, 2n: 2pts, 3r: 1pt, Exacte: +2pts)
  for (let i = 0; i < results.length; i++) {
    if (results[i].diff === Infinity) continue;

    let pos = 1;
    for (let j = 0; j < results.length; j++) {
      if (results[j].diff < results[i].diff) pos++;
    }

    let pts = 0;
    if (pos === 1) pts = 3;
    else if (pos === 2) pts = 2;
    else if (pos === 3) pts = 1;

    if (results[i].diff === 0) pts += 2; // Resposta exacta

    results[i].roundPoints = pts;

    const player = room.players.find((x) => x.id === results[i].id);
    if (player) player.score += pts;
  }

  const ranking = [...room.players].sort((a, b) => b.score - a.score);

  broadcastToRoom(
    room.id,
    JSON.stringify({
      type: "roundResults",
      correctAnswer: correct,
      results: results,
      ranking: ranking,
    }),
  );
  console.log(`Resultats enviats per a la sala ${room.id}`);
}

function leaveRoom(ws) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== ws.id);
  delete room.answers[ws.id];

  if (room.players.length === 0) {
    rooms.delete(ws.roomId);
    console.log(`Sala ${ws.roomId} buida, eliminada`);
  } else {
    if (room.hostId === ws.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
    broadcastToRoom(
      ws.roomId,
      JSON.stringify({
        type: "playerLeft",
        id: ws.id,
        name: ws.name,
        players: room.players,
      }),
    );
  }
  ws.roomId = null;
}

function broadcastToRoom(roomId, message) {
  if (!roomId || !wss) return;
  wss.clients.forEach((client) => {
    if (client.roomId === roomId && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Per si s'arrenca el fitxer sol amb: node ws/server.js
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  setupWebSocket();
  console.log("Servidor WebSocket autònom escoltant al port 3000");
}
