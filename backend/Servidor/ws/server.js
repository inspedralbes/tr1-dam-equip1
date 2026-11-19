import { WebSocketServer, WebSocket } from "ws";
// Capa de dades (MariaDB): les categories i les preguntes ara surten de la BD
import partidesRepo from "../bdd/data/partidesRepo.js";
import preguntesRepo from "../bdd/data/preguntesRepo.js";
import errors from "../bdd/utils/errors.js";

const rooms = new Map();
let nextClientId = 1;
let wss;

export function setupWebSocket(server) {
  wss = server
    ? new WebSocketServer({ server })
    : new WebSocketServer({ port: process.env.PORT || 3000 });

  wss.on("connection", (ws) => {
    ws.id = nextClientId++;
    ws.roomId = null;
    ws.name = null;
    ws.isHost = false;

    ws.on("message", async (raw) => {
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

        const name = (msg.name || `Jugador ${ws.id}`).trim();
        const maxPlayers = Number(msg.maxPlayers) || 10;
        const totalRounds = Number(msg.totalRounds) || 5;

        // Es crea la partida a la BD, i la BD dona el codi de 5 dígits (únic)
        let partida;
        try {
          partida = await partidesRepo.crearPartida(totalRounds, maxPlayers, name);
        } catch (error) {
          enviarErrorBD(ws, error);
          return;
        }

        const roomId = Number(partida.codi);
        ws.roomId = roomId;
        ws.name = name;
        ws.isHost = true;

        const room = {
          id: roomId,
          partidaId: partida.partidaId, // id de la partida a la BD
          participantIds: { [ws.id]: partida.participantId }, // id del jugador -> id a la BD
          rondaId: null,
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
        console.log(
          `Sala ${roomId} creada per ${ws.name} (Max: ${maxPlayers}, Rondes: ${totalRounds})`,
        );
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

        // A la BD (transacció): comprova que la partida encara accepta jugadors i l'afegeix
        try {
          room.participantIds[ws.id] = await partidesRepo.unirParticipant(
            room.partidaId,
            finalName,
            requestedName,
          );
        } catch (error) {
          enviarErrorBD(ws, error);
          return;
        }
        if (!rooms.has(roomId)) return; // la sala s'ha tancat mentre esperàvem la BD

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
            maxPlayers: room.maxPlayers,
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

        // 4 categories a l'atzar de la BD, i la partida passa a 'en_curs' (ja no hi pot entrar ningú)
        try {
          room.categories = await preguntesRepo.categoriesAleatories(4);
          await partidesRepo.iniciarPartida(room.partidaId);
        } catch (error) {
          enviarErrorBD(ws, error);
          return;
        }

        broadcastToRoom(
          ws.roomId,
          JSON.stringify({
            type: "categoryVoteStarted",
            categories: room.categories,
            totalPlayers: room.players.length,
          }),
        );
        console.log(
          `Votació de categories a sala ${ws.roomId}:`,
          room.categories,
        );
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

        // Es desa a la BD (transacció). Dona error si ja havia respost o si la ronda s'ha tancat
        try {
          await partidesRepo.respondre(room.rondaId, room.participantIds[ws.id], val);
        } catch (error) {
          enviarErrorBD(ws, error);
          return;
        }
        if (room.state !== "VOTING") return; // la ronda s'ha tancat mentre es desava

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

        // A la BD és una partida nova, amb el mateix codi i els mateixos jugadors
        try {
          const nova = await partidesRepo.reiniciarPartida(
            room.partidaId,
            room.players.map((p) => p.name),
          );
          room.partidaId = nova.partidaId;
          room.participantIds = {};
          for (const p of room.players) {
            room.participantIds[p.id] = nova.participantIds[p.name];
          }
        } catch (error) {
          enviarErrorBD(ws, error);
          return;
        }

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
      : room.categories && room.categories.length > 0
        ? room.categories[0]
        : "";

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

async function startNextQuestion(room) {
  room.round++;
  if (room.round > room.totalRounds) {
    finishGame(room);
    return;
  }

  // La pregunta surt de la BD: de la categoria votada i sense repetir dins la partida
  let ronda;
  try {
    ronda = await partidesRepo.obrirRonda(room.partidaId, room.round, room.selectedCategory);
  } catch (error) {
    logErrorBD(error);
    broadcastToRoom(
      room.id,
      JSON.stringify({ type: "error", message: "No s'ha pogut carregar la pregunta" }),
    );
    return;
  }
  const q = ronda.pregunta;
  room.rondaId = ronda.rondaId;

  // El rang del slider es calcula ara (no es desa a la BD)
  const rang = calcularRang(q.answer, q.unit);
  q.min = rang.min;
  q.max = rang.max;

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

  // Desem a la BD la posició i els punts de cada resposta i tanquem la ronda (transacció)
  const puntuacions = results
    .filter((r) => r.estimate !== null)
    .map((r, i) => ({
      participantId: room.participantIds[r.id],
      posicio: i + 1,
      punts: r.roundPoints,
    }));
  partidesRepo.tancarRonda(room.rondaId, puntuacions).catch(logErrorBD);

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

  partidesRepo.acabarPartida(room.partidaId).catch(logErrorBD);

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

  // A la BD: si encara som a la sala d'espera, el traiem de la partida
  if (room.state === "LOBBY" && room.participantIds[ws.id]) {
    partidesRepo.treureParticipant(room.participantIds[ws.id]).catch(logErrorBD);
  }

  if (room.players.length === 0) {
    if (room.countdownInterval) clearInterval(room.countdownInterval);
    rooms.delete(ws.roomId);
    partidesRepo.abandonarPartida(room.partidaId).catch(logErrorBD);
    console.log(`Sala ${ws.roomId} eliminada`);
  } else {
    if (room.hostId === ws.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
      partidesRepo
        .canviarAmfitrio(room.partidaId, room.participantIds[room.hostId])
        .catch(logErrorBD);
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

// Rang del slider: es calcula a l'atzar cada cop que surt una pregunta (no es desa a la BD),
// perquè si torna a sortir en una altra partida la resposta no estigui al mateix lloc.
// Sempre conté la resposta correcta.
function calcularRang(correcta, unitat) {
  let amplada;
  if (unitat === "any") {
    amplada = 100 + Math.floor(Math.random() * 301); // anys: un marge d'entre 100 i 400 anys
  } else {
    amplada = Math.max(10, Math.round(Math.abs(correcta) * (1 + Math.random() * 2))); // entre 1 i 3 cops el valor
  }
  const posicio = 0.1 + Math.random() * 0.8; // la resposta cau entre el 10% i el 90% del slider
  let min = Math.round(correcta - amplada * posicio);
  let max = min + amplada;
  // si la resposta és positiva, que el slider no comenci en negatiu
  if (correcta > 0 && min < 0) {
    max = max - min;
    min = 0;
  }
  return { min, max };
}

// Errors de la BD: si és un error del joc (AppError) el missatge es pot ensenyar al client
function enviarErrorBD(ws, error) {
  if (!(error instanceof errors.AppError)) logErrorBD(error);
  ws.send(
    JSON.stringify({
      type: "error",
      message:
        error instanceof errors.AppError
          ? error.message
          : "Error de la base de dades, torna-ho a provar",
    }),
  );
}

function logErrorBD(error) {
  const { titol, solucio } = errors.explicarError(error);
  console.error(`[BD] ${titol} -> ${solucio}`);
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  setupWebSocket();
  console.log("Servidor WebSocket autònom escoltant al port 3000");
}
