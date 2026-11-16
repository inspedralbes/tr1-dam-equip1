import { WebSocketServer, WebSocket } from "ws";

const rooms = new Map();
let nextClientId = 1;
let wss;

const categories = [
  "Ciència i Natura",
  "Història",
  "Geografia",
  "Esports",
  "Cinema i Sèries",
  "Música",
  "Art i Literatura",
  "Tecnologia",
];

const questions = [
  { text: "Quants quilòmetres de vasos sanguinis hi ha al cos humà?", answer: 100000, min: 10000, max: 200000, unit: "km" },
  { text: "Quantes formigues hi ha al món (en milions de milions)?", answer: 20, min: 1, max: 100, unit: "milions de milions" },
  { text: "Quantes finestres té l'Empire State Building?", answer: 6500, min: 1000, max: 15000, unit: "finestres" },
  { text: "Quants quilòmetres mesura aproximadament l'equador terrestre?", answer: 40075, min: 10000, max: 100000, unit: "km" },
  { text: "Quants metres d'alçada fa l'Everest?", answer: 8849, min: 5000, max: 15000, unit: "metres" },
  { text: "Quants ossos té el cos humà d'un adult?", answer: 206, min: 50, max: 500, unit: "ossos" },
  { text: "Quants països hi ha actualment al món reconeguts per l'ONU?", answer: 193, min: 50, max: 350, unit: "països" },
  { text: "Quants dents té un ésser humà adult?", answer: 32, min: 10, max: 60, unit: "dents" },
  { text: "A quina temperatura (ºC) es congela l'aigua?", answer: 0, min: -50, max: 50, unit: "ºC" },
  { text: "Quants cors té un pop?", answer: 3, min: 1, max: 10, unit: "cors" },
  { text: "Quants segons té una hora?", answer: 3600, min: 1000, max: 10000, unit: "segons" },
  { text: "Quantes tecles té un piano estàndard?", answer: 88, min: 40, max: 120, unit: "tecles" },
  { text: "Quants minuts triga la llum del Sol a arribar a la Terra?", answer: 8, min: 1, max: 30, unit: "minuts" },
  { text: "Quantes potes té una aranya?", answer: 8, min: 2, max: 20, unit: "potes" },
  { text: "Quants dies té un any de traspàs?", answer: 366, min: 300, max: 400, unit: "dies" },
];

export function setupWebSocket(server) {
  wss = server
    ? new WebSocketServer({ server })
    : new WebSocketServer({ port: process.env.PORT || 3000 });

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

        // Codi de 5 dígits
        const roomId = Math.floor(10000 + Math.random() * 90000);
        ws.roomId = roomId;
        ws.name = (msg.name || `Jugador ${ws.id}`).trim();
        ws.isHost = true;

        const maxPlayers = Number(msg.maxPlayers) || 10;
        const totalRounds = Number(msg.totalRounds) || 5;

        const room = {
          id: roomId,
          hostId: ws.id,
          state: "LOBBY",
          players: [{ id: ws.id, name: ws.name, score: 0 }],
          maxPlayers: maxPlayers,
          totalRounds: totalRounds,
          round: 0,
          currentQuestion: null,
          answers: {},
          answersOrder: [],
          categories: [],
          categoryVotes: {},
          selectedCategory: null,
          usedQuestions: [],
          timerStarted: false,
          countdownInterval: null,
        };
        rooms.set(roomId, room);

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomId: roomId,
            isHost: true,
            name: ws.name,
            players: room.players,
            maxPlayers: maxPlayers,
            totalRounds: totalRounds,
          }),
        );
        console.log(`Sala ${roomId} creada per ${ws.name} (Max: ${maxPlayers}, Rondes: ${totalRounds})`);
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

        if (room.players.length >= room.maxPlayers) {
          ws.send(
            JSON.stringify({ type: "error", message: "La sala està plena" }),
          );
          return;
        }

        if (ws.roomId && ws.roomId !== roomId) {
          leaveRoom(ws);
        }

        // Gestió de noms duplicats a la sala
        let requestedName = (msg.name || `Jugador ${ws.id}`).trim();
        let existingNames = room.players
          .filter((p) => p.id !== ws.id)
          .map((p) => p.name.toLowerCase());
        let finalName = requestedName;
        if (existingNames.includes(requestedName.toLowerCase())) {
          let count = 2;
          while (
            existingNames.includes(`${requestedName} (${count})`.toLowerCase())
          ) {
            count++;
          }
          finalName = `${requestedName} (${count})`;
        }

        ws.roomId = roomId;
        ws.name = finalName;
        ws.isHost = room.hostId === ws.id;

        if (!room.players.some((p) => p.id === ws.id)) {
          room.players.push({ id: ws.id, name: finalName, score: 0 });
        }

        ws.send(
          JSON.stringify({
            type: "roomJoined",
            roomId: roomId,
            isHost: ws.isHost,
            name: finalName,
            players: room.players,
            totalRounds: room.totalRounds,
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

        console.log(`Client ${ws.id} (${ws.name}) unit a sala ${roomId}`);
      }

      // 3. INICIAR VOTACIÓ DE CATEGORIES
      if (msg.type === "startCategoryVote" || msg.type === "startCategories") {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        if (room.hostId !== ws.id) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Només l'amfitrió pot iniciar la votació de categories",
            }),
          );
          return;
        }

        room.state = "VOTING_CATEGORY";
        room.categoryVotes = {};
        room.selectedCategory = null;

        const shuffled = [...categories].sort(() => 0.5 - Math.random());
        room.categories = shuffled.slice(0, 4);

        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "categoryVoteStarted",
            categories: room.categories,
            totalPlayers: room.players.length,
          }),
        );
        console.log(`Votació de categories a sala ${ws.roomId}:`, room.categories);
      }

      // 4. VOTAR CATEGORIA
      if (msg.type === "voteCategory") {
        const room = rooms.get(ws.roomId);
        if (!room) return;

        const cat = msg.category;
        if (!cat) return;

        room.categoryVotes[ws.id] = cat;
        console.log(`Jugador ${ws.name} ha votat categoria: ${cat}`);

        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "categoryVoted",
            id: ws.id,
            name: ws.name,
            category: cat,
            votedCount: Object.keys(room.categoryVotes).length,
            totalPlayers: room.players.length,
          }),
        );

        if (Object.keys(room.categoryVotes).length >= room.players.length) {
          finishCategoryVote(room);
        }
      }

      // 5. ENVIAR RESPOSTA NUMÈRICA
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
        room.answersOrder.push(ws.id);

        console.log(`Jugador ${ws.name} estimació: ${val}`);

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

        const answeredCount = Object.keys(room.answers).length;

        // Regla: Si la majoria ha respost, iniciem comptador de 15s si no està actiu
        if (
          answeredCount >= Math.ceil(room.players.length / 2) &&
          !room.timerStarted &&
          room.players.length > 1
        ) {
          room.timerStarted = true;
          let secondsLeft = 15;
          broadcastToRoom(
            ws.roomId,
            JSON.stringify({
              type: "timerStarted",
              seconds: secondsLeft,
            }),
          );
          room.countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
              clearInterval(room.countdownInterval);
              room.countdownInterval = null;
              finishRound(room);
            }
          }, 1000);
        }

        // Si tothom ha votat, tanquem immediatament
        if (answeredCount >= room.players.length) {
          if (room.countdownInterval) {
            clearInterval(room.countdownInterval);
            room.countdownInterval = null;
          }
          finishRound(room);
        }
      }

      // 6. SEGÜENT RONDA (Amfitrió)
      if (msg.type === "nextRound") {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        if (room.hostId !== ws.id) return;

        if (room.round < room.totalRounds) {
          startNextQuestion(room);
        } else {
          finishGame(room);
        }
      }

      // 7. NOVA PARTIDA (Amfitrió)
      if (msg.type === "restartGame") {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        if (room.hostId !== ws.id) return;

        room.round = 0;
        room.usedQuestions = [];
        room.state = "LOBBY";
        for (const p of room.players) {
          p.score = 0;
        }

        broadcastToRoom(
          room.id,
          JSON.stringify({
            type: "gameRestarted",
            players: room.players,
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

function finishCategoryVote(room) {
  if (room.state !== "VOTING_CATEGORY" && room.state !== "LOBBY") return;
  room.state = "CATEGORY_CHOSEN";

  const counts = {};
  if (room.categories) {
    for (const c of room.categories) counts[c] = 0;
  }
  for (const id in room.categoryVotes) {
    const c = room.categoryVotes[id];
    counts[c] = (counts[c] || 0) + 1;
  }

  let maxVotes = -1;
  if (room.categories) {
    for (const c of room.categories) {
      const v = counts[c] || 0;
      if (v > maxVotes) {
        maxVotes = v;
      }
    }
  }

  // Totes les categories que tenen el nombre màxim de vots
  const tiedCategories = (room.categories || []).filter(
    (c) => (counts[c] || 0) === maxVotes,
  );

  // Desempat intel·ligent: Si hi ha empat, se selecciona aleatòriament entre les empatades!
  const winningCat =
    tiedCategories.length > 0
      ? tiedCategories[Math.floor(Math.random() * tiedCategories.length)]
      : (room.categories && room.categories.length > 0 ? room.categories[0] : "");

  room.selectedCategory = winningCat;

  broadcastToRoom(
    room.id,
    JSON.stringify({
      type: "categorySelected",
      category: winningCat,
      votes: counts,
    }),
  );
  console.log(`Categoria guanyadora a sala ${room.id}: ${winningCat}`);

  // Després de 3.5 segons revelant la categoria guanyadora, comença la primera pregunta!
  setTimeout(() => {
    startNextQuestion(room);
  }, 3500);
}

function startNextQuestion(room) {
  room.round++;
  if (room.round > room.totalRounds) {
    finishGame(room);
    return;
  }

  const pool = questions.filter((q) => !room.usedQuestions.includes(q.text));
  const qList = pool.length > 0 ? pool : questions;
  const q = qList[Math.floor(Math.random() * qList.length)];
  room.usedQuestions.push(q.text);

  room.currentQuestion = q;
  room.state = "VOTING";
  room.answers = {};
  room.answersOrder = [];
  room.timerStarted = false;
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }

  broadcastToRoom(
    room.id,
    JSON.stringify({
      type: "roundStarted",
      round: room.round,
      totalRounds: room.totalRounds,
      question: q.text,
      min: q.min || 0,
      max: q.max || 100,
      unit: q.unit || "",
      totalPlayers: room.players.length,
    }),
  );
  console.log(`Ronda ${room.round}/${room.totalRounds} iniciada: "${q.text}"`);
}

function finishRound(room) {
  if (room.state !== "VOTING") return;
  room.state = "RESULTS";
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }

  const correct = room.currentQuestion.answer;
  const results = [];

  for (const p of room.players) {
    const ans = room.answers[p.id];
    const answered = ans !== undefined;
    const diff = answered ? Math.abs(ans - correct) : Infinity;
    const orderIndex = room.answersOrder.indexOf(p.id);

    results.push({
      id: p.id,
      name: p.name,
      estimate: answered ? ans : null,
      diff: diff,
      order: orderIndex >= 0 ? orderIndex : 999,
      roundPoints: 0,
      score: p.score,
    });
  }

  // Ordenem per menor diferència, i en empat pel més ràpid
  results.sort((a, b) => {
    if (a.diff === b.diff) return a.order - b.order;
    return a.diff - b.diff;
  });

  // Punts: 1r: 3pts, 2n: 2pts, 3r: 1pt, Exacte: +2pts
  for (let i = 0; i < results.length; i++) {
    if (results[i].diff === Infinity) continue;
    let pts = 0;
    if (i === 0) pts = 3;
    else if (i === 1) pts = 2;
    else if (i === 2) pts = 1;

    if (results[i].diff === 0) pts += 2;

    results[i].roundPoints = pts;
    const player = room.players.find((x) => x.id === results[i].id);
    if (player) {
      player.score += pts;
      results[i].score = player.score;
    }
  }

  const ranking = [...room.players].sort((a, b) => b.score - a.score);

  broadcastToRoom(
    room.id,
    JSON.stringify({
      type: "roundResults",
      round: room.round,
      totalRounds: room.totalRounds,
      question: room.currentQuestion.text,
      correctAnswer: correct,
      min: room.currentQuestion.min || 0,
      max: room.currentQuestion.max || 100,
      unit: room.currentQuestion.unit || "",
      results: results,
      ranking: ranking,
    }),
  );
  console.log(`Resultats ronda ${room.round}/${room.totalRounds} enviats`);
}

function finishGame(room) {
  room.state = "GAME_OVER";
  const ranking = [...room.players].sort((a, b) => b.score - a.score);

  broadcastToRoom(
    room.id,
    JSON.stringify({
      type: "gameOver",
      ranking: ranking,
    }),
  );
  console.log(`Partida finalitzada a la sala ${room.id}`);
}

function leaveRoom(ws) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== ws.id);
  delete room.answers[ws.id];
  if (room.categoryVotes) {
    delete room.categoryVotes[ws.id];
  }

  if (room.players.length === 0) {
    if (room.countdownInterval) clearInterval(room.countdownInterval);
    rooms.delete(ws.roomId);
    console.log(`Sala ${ws.roomId} eliminada`);
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

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  setupWebSocket();
  console.log("Servidor WebSocket autònom escoltant al port 3000");
}
