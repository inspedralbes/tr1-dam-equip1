import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import * as jocService from "../db/jocService.js";
import * as preguntesService from "../db/preguntesService.js";

const rooms = new Map();
let nextClientId = 1;
let wss;

// Si un jugador perd la connexió (p. ex. recarrega la pàgina), li guardem el lloc aquests ms
const TEMPS_PER_TORNAR = 15000;

const defaultCategories = [
  "Ciència",
  "Història",
  "Geografia",
  "Cultura",
  "Curiositats",
];

const defaultQuestions = [
  { id: 1, text: "Quants quilòmetres de vasos sanguinis hi ha al cos humà?", answer: 100000, min: 10000, max: 200000, unit: "km" },
  { id: 2, text: "Quantes formigues hi ha al món (en milions de milions)?", answer: 20, min: 1, max: 100, unit: "milions de milions" },
  { id: 3, text: "Quantes finestres té l'Empire State Building?", answer: 6500, min: 1000, max: 15000, unit: "finestres" },
  { id: 4, text: "Quants quilòmetres mesura aproximadament l'equador terrestre?", answer: 40075, min: 10000, max: 100000, unit: "km" },
  { id: 5, text: "Quants metres d'alçada fa l'Everest?", answer: 8849, min: 5000, max: 15000, unit: "metres" },
  { id: 6, text: "Quants ossos té el cos humà d'un adult?", answer: 206, min: 50, max: 500, unit: "ossos" },
  { id: 7, text: "Quants països hi ha actualment al món reconeguts per l'ONU?", answer: 193, min: 50, max: 350, unit: "països" },
  { id: 8, text: "Quants dents té un ésser humà adult?", answer: 32, min: 10, max: 60, unit: "dents" },
  { id: 9, text: "A quina temperatura (ºC) es congela l'aigua?", answer: 0, min: -50, max: 50, unit: "ºC" },
  { id: 10, text: "Quants cors té un pop?", answer: 3, min: 1, max: 10, unit: "cors" },
  { id: 11, text: "Quants segons té una hora?", answer: 3600, min: 1000, max: 10000, unit: "segons" },
  { id: 12, text: "Quantes tecles té un piano estàndard?", answer: 88, min: 40, max: 120, unit: "tecles" },
  { id: 13, text: "Quants minuts triga la llum del Sol a arribar a la Terra?", answer: 8, min: 1, max: 30, unit: "minuts" },
  { id: 14, text: "Quantes potes té una aranya?", answer: 8, min: 2, max: 20, unit: "potes" },
  { id: 15, text: "Quants dies té un any de traspàs?", answer: 366, min: 300, max: 400, unit: "dies" },
];

function getRoomPlayersPayload(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    avatar: p.avatar ?? 0,
    isHost: p.id === room.hostId,
  }));
}

export function setupWebSocket(server) {
  wss = server
    ? new WebSocketServer({ server })
    : new WebSocketServer({ port: process.env.PORT || 3000 });

  wss.on("connection", (ws) => {
    ws.id = nextClientId++;
    ws.roomId = null;
    ws.dbParticipantId = null;
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

      // 1. CREAR SALA (RAD-3 / T7)
      if (msg.type === "createRoom") {
        leaveRoom(ws);

        const roomId = Math.floor(10000 + Math.random() * 90000);
        ws.roomId = roomId;
        ws.name = (msg.name || `Jugador ${ws.id}`).trim();
        ws.isHost = true;

        const maxPlayers = Number(msg.maxPlayers) || 10;
        const totalRounds = Number(msg.totalRounds) || 5;

        let dbPartidaId = null;
        let dbPartId = null;

        // Persistència a la base de dades
        try {
          const dbPartida = await jocService.crearPartida(String(roomId), maxPlayers, totalRounds);
          dbPartidaId = dbPartida.id;

          const dbPart = await jocService.unirsePartida(String(roomId), ws.name);
          dbPartId = dbPart.id;
          ws.dbParticipantId = dbPartId;
        } catch (err) {
          console.error("Error en persistir creació de partida:", err.message);
        }

        const token = randomUUID(); // secret per poder tornar a la partida si recarrega

        const room = {
          id: roomId,
          dbId: dbPartidaId,
          hostId: ws.id,
          state: "LOBBY",
          players: [{ id: ws.id, dbId: dbPartId, name: ws.name, score: 0, avatar: Number.isFinite(Number(msg.avatar)) ? Number(msg.avatar) : 0 }],
          maxPlayers: maxPlayers,
          totalRounds: totalRounds,
          round: 0,
          currentRondaDbId: null,
          currentQuestion: null,
          answers: {},
          answersOrder: [],
          categories: [],
          categoryVotes: {},
          selectedCategory: null,
          usedQuestions: [],
          timerStarted: false,
          countdownInterval: null,
          tokens: { [token]: ws.id }, // token -> id del jugador (no va dins de players perquè no s'enviï als altres)
          sortidesPendents: {}, // id del jugador -> setTimeout que el treu si no torna
        };
        rooms.set(roomId, room);

        const playersPayload = getRoomPlayersPayload(room);

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomId: roomId,
            isHost: true,
            name: ws.name,
            token: token,
            players: playersPayload,
            maxPlayers: maxPlayers,
            totalRounds: totalRounds,
          }),
        );
        console.log(`Sala ${roomId} creada per ${ws.name} (Max: ${maxPlayers}, Rondes: ${totalRounds})`);
      }

      // 2. UNIR-SE A UNA SALA (RAD-3 / RAD-4 / T7 / T11)
      if (msg.type === "joinRoom") {
        const roomId = Number(msg.roomId || msg.code);
        const room = rooms.get(roomId);

        if (!room) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "ROOM_NOT_FOUND",
              message: "No existeix cap sala amb aquest codi",
            }),
          );
          return;
        }

        if (room.state !== "LOBBY") {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "INVALID_STATE",
              message: "La partida ja ha començat",
            }),
          );
          return;
        }

        if (room.players.length >= room.maxPlayers) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "ROOM_FULL",
              message: "La sala està plena",
            }),
          );
          return;
        }

        const requestedName = (msg.name || `Jugador ${ws.id}`).trim();

        // T7: Un nom repetit es rebutja (norma de la rúbrica)
        const nameExists = room.players.some(
          (p) => p.name.toLowerCase() === requestedName.toLowerCase()
        );
        if (nameExists) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "NAME_TAKEN",
              message: "Aquest nom ja està en ús a la sala",
            }),
          );
          return;
        }

        if (ws.roomId && ws.roomId !== roomId) {
          leaveRoom(ws);
        }

        // Operació transaccional RAD-4 amb bloqueig SELECT ... FOR UPDATE (T11)
        let dbPartId = null;
        try {
          const dbPart = await jocService.unirsePartida(String(roomId), requestedName);
          dbPartId = dbPart.id;
        } catch (err) {
          console.error("Error en unió transaccional:", err.message);
          if (err.code === 'NAME_TAKEN' || err.code === 'GAME_NOT_ACCEPTING_PLAYERS' || err.code === 'ROOM_FULL' || err.code === 'ROOM_NOT_FOUND') {
            ws.send(JSON.stringify({ type: "error", code: err.code, message: err.message }));
            return;
          }
        }

        ws.roomId = roomId;
        ws.dbParticipantId = dbPartId;
        ws.name = requestedName;
        ws.isHost = room.hostId === ws.id;

        const avatarId = Number.isFinite(Number(msg.avatar)) ? Number(msg.avatar) : 0;
        const existingPlayer = room.players.find((p) => p.id === ws.id);
        if (!existingPlayer) {
          room.players.push({ id: ws.id, dbId: dbPartId, name: requestedName, score: 0, avatar: avatarId });
        } else {
          existingPlayer.avatar = avatarId;
        }

        const token = randomUUID();
        room.tokens[token] = ws.id;

        const playersPayload = getRoomPlayersPayload(room);

        ws.send(
          JSON.stringify({
            type: "roomJoined",
            roomId: roomId,
            isHost: ws.isHost,
            name: requestedName,
            token: token,
            players: playersPayload,
            totalRounds: room.totalRounds,
          }),
        );

        broadcastToRoom(
          roomId,
          JSON.stringify({
            type: "playerJoined",
            player: { id: ws.id, name: ws.name, score: 0, avatar: avatarId, isHost: ws.isHost },
            players: playersPayload,
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
              code: "NOT_HOST",
              message: "Només l'amfitrió pot iniciar la votació de categories",
            }),
          );
          return;
        }

        room.state = "VOTING_CATEGORY";
        room.categoryVotes = {};
        room.selectedCategory = null;

        let catNames = [];
        try {
          const dbCats = await preguntesService.getCategories();
          if (dbCats && dbCats.length > 0) {
            catNames = dbCats.map((c) => c.nom);
          }
        } catch (e) {
          catNames = defaultCategories;
        }
        if (catNames.length === 0) catNames = defaultCategories;

        const shuffled = [...catNames].sort(() => 0.5 - Math.random());
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

      // 4b. L'amfitrió tanca la votació abans que votin tots ("Tancar votació")
      if (msg.type === "endCategoryVote") {
        const room = rooms.get(ws.roomId);
        if (!room || room.hostId !== ws.id) return;
        if (room.state === "VOTING_CATEGORY") finishCategoryVote(room);
      }

      // 4c. L'amfitrió no vol esperar els 3,5 s ("Començar ronda")
      if (msg.type === "startRound") {
        const room = rooms.get(ws.roomId);
        if (!room || room.hostId !== ws.id) return;
        if (room.state === "CATEGORY_CHOSEN") {
          clearTimeout(room.startTimeout);
          room.state = "STARTING_ROUND"; // perquè un doble clic no comenci dues rondes
          startNextQuestion(room);
        }
      }

      // 5. ENVIAR RESPOSTA NUMÈRICA (RAD-3 / RAD-4 / T8 / T11)
      if (msg.type === "submitAnswer") {
        const room = rooms.get(ws.roomId);
        if (!room || room.state !== "VOTING") return;

        const val = Number(msg.answer ?? msg.estimate ?? msg.value);
        if (isNaN(val)) return;

        // T8: Una segona resposta a la mateixa ronda es rebutja
        if (room.answers[ws.id] !== undefined) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "ALREADY_ANSWERED",
              message: "Ja has respost aquesta ronda",
            }),
          );
          return;
        }

        // Operació transaccional RAD-4 amb bloqueig de ronda oberta (T11)
        if (room.currentRondaDbId && ws.dbParticipantId) {
          try {
            await jocService.respondreRonda(ws.dbParticipantId, room.currentRondaDbId, val);
          } catch (err) {
            console.error("Error en respondre transaccional:", err.message);
            if (err.code === 'ROUND_CLOSED' || err.code === 'ALREADY_ANSWERED') {
              ws.send(JSON.stringify({ type: "error", code: err.code, message: err.message }));
              return;
            }
          }
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
          room.timerEnd = Date.now() + secondsLeft * 1000; // per saber quant en queda si algú torna
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

        // A la BD és una partida nova (si no, les rondes xoquen amb les de l'anterior)
        if (room.dbId) {
          try {
            await jocService.arxivarPartida(room.dbId);
            const nova = await jocService.crearPartida(String(room.id), room.maxPlayers, room.totalRounds);
            room.dbId = nova.id;
            room.currentRondaDbId = null;
            for (const p of room.players) {
              const part = await jocService.unirsePartida(String(room.id), p.name);
              p.dbId = part.id;
            }
            wss.clients.forEach((c) => {
              const p = room.players.find((x) => x.id === c.id);
              if (c.roomId === room.id && p) c.dbParticipantId = p.dbId;
            });
          } catch (err) {
            console.error("Error en crear la nova partida a la BD:", err.message);
          }
        }

        broadcastToRoom(
          room.id,
          JSON.stringify({
            type: "gameRestarted",
            players: getRoomPlayersPayload(room),
          }),
        );
      }

      // 8. SORTIR DE LA SALA (botó "Sortir"): marxa del tot, sense esperar que torni
      if (msg.type === "leaveRoom") {
        leaveRoom(ws);
      }

      // 9. TORNAR A LA PARTIDA després de recarregar la pàgina
      if (msg.type === "reconnect") {
        const room = rooms.get(Number(msg.roomId));
        const playerId = room ? room.tokens[msg.token] : undefined;
        const player = room ? room.players.find((p) => p.id === playerId) : undefined;
        if (!player) {
          ws.send(
            JSON.stringify({
              type: "error",
              code: "RECONNECT_FAILED",
              message: "Ja no formes part d'aquesta partida",
            }),
          );
          return;
        }

        // Ja no l'hem de treure de la sala
        clearTimeout(room.sortidesPendents[player.id]);
        delete room.sortidesPendents[player.id];

        // Si el socket vell encara és viu, el despengem de la sala i el tanquem
        wss.clients.forEach((c) => {
          if (c !== ws && c.id === player.id && c.roomId === room.id) {
            c.roomId = null;
            c.terminate();
          }
        });

        // El socket nou passa a ser el mateix jugador (mateix id: vots, respostes i amfitrió es mantenen)
        ws.id = player.id;
        ws.roomId = room.id;
        ws.name = player.name;
        ws.dbParticipantId = player.dbId;
        ws.isHost = room.hostId === player.id;

        ws.send(
          JSON.stringify({
            type: "roomJoined",
            roomId: room.id,
            isHost: ws.isHost,
            name: player.name,
            token: msg.token,
            players: getRoomPlayersPayload(room),
            totalRounds: room.totalRounds,
          }),
        );
        enviarEstatPartida(ws, room);
        ws.send(JSON.stringify({ type: "reconnected", state: room.state }));
        console.log(`Client ${ws.id} (${ws.name}) ha tornat a la sala ${room.id}`);
      }
    });

    ws.on("close", () => {
      console.log(`Client ${ws.id} Desconectat`);
      const room = rooms.get(ws.roomId);
      if (!room) return;

      // Potser només ha recarregat la pàgina: el traiem de la sala si no torna a temps
      room.sortidesPendents[ws.id] = setTimeout(() => {
        delete room.sortidesPendents[ws.id];
        leaveRoom(ws);
      }, TEMPS_PER_TORNAR);
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

  // Desempat intel·ligent: Si hi ha empat, se selecciona aleatòriament entre les empatades
  const winningCat =
    tiedCategories.length > 0
      ? tiedCategories[Math.floor(Math.random() * tiedCategories.length)]
      : (room.categories && room.categories.length > 0 ? room.categories[0] : "");

  room.selectedCategory = winningCat;

  // el guardem per tornar-lo a enviar a qui recarregui la pàgina
  room.lastCategorySelected = JSON.stringify({
    type: "categorySelected",
    category: winningCat,
    votes: counts,
  });
  broadcastToRoom(room.id, room.lastCategorySelected);
  console.log(`Categoria guanyadora a sala ${room.id}: ${winningCat}`);

  // guardem el temporitzador per poder cancel·lar-lo si l'amfitrió prem "Començar ronda"
  room.startTimeout = setTimeout(() => {
    startNextQuestion(room);
  }, 3500);
}

async function startNextQuestion(room) {
  room.round++;
  if (room.round > room.totalRounds) {
    finishGame(room);
    return;
  }

  // Marcar partida com a en_curs
  if (room.round === 1 && room.dbId) {
    try {
      await jocService.iniciarPartida(room.dbId);
    } catch (e) {
      console.error("Error en iniciar partida a DB:", e.message);
    }
  }

  // RAD-3 / T8: Obrir rondes amb preguntes que encara no s'hagin fet en aquella partida
  let q = null;
  if (room.dbId) {
    try {
      const disponibles = await jocService.obtenirPreguntesDisponibles(room.dbId);
      if (disponibles && disponibles.length > 0) {
        let filtrades = disponibles;
        if (room.selectedCategory) {
          const catMatches = disponibles.filter(
            (p) => p.categoria_nom && p.categoria_nom.toLowerCase() === room.selectedCategory.toLowerCase()
          );
          if (catMatches.length > 0) filtrades = catMatches;
        }

        const triada = filtrades[Math.floor(Math.random() * filtrades.length)];
        q = {
          id: triada.id,
          text: triada.enunciat,
          answer: Number(triada.resposta),
          min: triada.min_valor !== null ? Number(triada.min_valor) : 0,
          max: triada.max_valor !== null ? Number(triada.max_valor) : 100,
          unit: triada.unitat,
        };

        const dbRonda = await jocService.crearRonda(room.dbId, room.round, triada.id);
        room.currentRondaDbId = dbRonda.id;
      }
    } catch (err) {
      console.error("Error en carregar preguntes de la DB:", err.message);
    }
  }

  // Fallback si la DB no té preguntes o està offline
  if (!q) {
    const pool = defaultQuestions.filter((item) => !room.usedQuestions.includes(item.text));
    const qList = pool.length > 0 ? pool : defaultQuestions;
    q = qList[Math.floor(Math.random() * qList.length)];
  }

  room.usedQuestions.push(q.text);
  room.currentQuestion = q;
  room.state = "VOTING";
  room.answers = {};
  room.answersOrder = [];
  room.timerStarted = false;
  room.timerEnd = null;
  room.lastRoundResults = null;
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }

  broadcastToRoom(room.id, JSON.stringify(missatgeRonda(room)));
  console.log(`Ronda ${room.round}/${room.totalRounds} iniciada: "${q.text}"`);
}

function missatgeRonda(room) {
  const q = room.currentQuestion;
  return {
    type: "roundStarted",
    round: room.round,
    totalRounds: room.totalRounds,
    question: q.text,
    min: q.min || 0,
    max: q.max || 100,
    unit: q.unit || "",
    totalPlayers: room.players.length,
  };
}

// Envia a un sol jugador (el que torna després de recarregar) el que ha passat fins ara.
// Fa servir els mateixos missatges que la partida normal, així el client gairebé no canvia.
function enviarEstatPartida(ws, room) {
  const enviar = (m) => ws.send(typeof m === "string" ? m : JSON.stringify(m));

  if (["VOTING_CATEGORY", "CATEGORY_CHOSEN", "STARTING_ROUND"].includes(room.state)) {
    enviar({ type: "categoryVoteStarted", categories: room.categories, totalPlayers: room.players.length });

    const idsVots = Object.keys(room.categoryVotes);
    for (const id of idsVots) {
      const p = room.players.find((x) => x.id === Number(id));
      enviar({
        type: "categoryVoted",
        id: Number(id),
        name: p ? p.name : "",
        category: room.categoryVotes[id],
        votedCount: idsVots.length,
        totalPlayers: room.players.length,
      });
    }

    if (room.state !== "VOTING_CATEGORY" && room.lastCategorySelected) {
      enviar(room.lastCategorySelected);
    }
  }

  if (room.state === "VOTING") {
    // yourAnswer: la seva resposta, si ja n'havia enviat (només li arriba a ell)
    enviar({ ...missatgeRonda(room), yourAnswer: room.answers[ws.id] ?? null });

    for (const id of room.answersOrder) {
      const p = room.players.find((x) => x.id === id);
      enviar({
        type: "playerVoted",
        id: id,
        name: p ? p.name : "",
        votedCount: Object.keys(room.answers).length,
        totalPlayers: room.players.length,
      });
    }

    if (room.timerEnd) {
      const segons = Math.ceil((room.timerEnd - Date.now()) / 1000);
      if (segons > 0) enviar({ type: "timerStarted", seconds: segons, total: 15 });
    }
  }

  if (room.state === "RESULTS" && room.lastRoundResults) enviar(room.lastRoundResults);
  if (room.state === "GAME_OVER" && room.lastGameOver) enviar(room.lastGameOver);
}

async function finishRound(room) {
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
      dbId: p.dbId,
      name: p.name,
      avatar: p.avatar ?? 0,
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
  const dbUpdates = [];
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

    if (results[i].dbId) {
      dbUpdates.push({
        participant_id: results[i].dbId,
        posicio: i + 1,
        punts: pts,
      });
    }
  }

  // RAD-4 Transacció: Tancar una ronda (atomicitat - T10)
  if (room.currentRondaDbId && dbUpdates.length > 0) {
    try {
      await jocService.tancarRonda(room.currentRondaDbId, dbUpdates);
    } catch (err) {
      console.error("Error transaccional en tancar ronda a DB:", err.message);
    }
  }

  const ranking = [...room.players].sort((a, b) => b.score - a.score);

  room.lastRoundResults = JSON.stringify({
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
  });
  broadcastToRoom(room.id, room.lastRoundResults);
  console.log(`Resultats ronda ${room.round}/${room.totalRounds} enviats`);
}

async function finishGame(room) {
  room.state = "GAME_OVER";

  if (room.dbId) {
    try {
      await jocService.acabarPartida(room.dbId);
    } catch (err) {
      console.error("Error en marcar partida com a acabada:", err.message);
    }
  }

  // RAD-3 / T9: Rànquing final calculat amb SQL (JOIN, SUM, GROUP BY) si hi ha DB
  let ranking = [...room.players].sort((a, b) => b.score - a.score);
  if (room.dbId) {
    try {
      const dbRanking = await jocService.obtenirClassificacio(room.dbId);
      if (dbRanking && dbRanking.length > 0) {
        // només els que encara són a la sala (a la BD hi ha també els que han marxat)
        ranking = dbRanking.filter((r) => room.players.some((p) => p.name === r.nom)).map((r) => {
          const pl = room.players.find((p) => p.name === r.nom);
          return {
            name: r.nom,
            score: Number(r.punts_totals),
            avatar: pl ? (pl.avatar ?? 0) : 0,
          };
        });
      }
    } catch (e) {
      console.error("Error obtenint classificació SQL:", e.message);
    }
  }

  room.lastGameOver = JSON.stringify({
    type: "gameOver",
    ranking: ranking,
  });
  broadcastToRoom(room.id, room.lastGameOver);
  console.log(`Partida finalitzada a la sala ${room.id}`);
}

function leaveRoom(ws) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== ws.id);
  delete room.answers[ws.id];
  clearTimeout(room.sortidesPendents[ws.id]);
  delete room.sortidesPendents[ws.id];
  for (const t in room.tokens) {
    if (room.tokens[t] === ws.id) delete room.tokens[t];
  }
  if (room.categoryVotes) {
    delete room.categoryVotes[ws.id];
  }

  // Si encara no ha començat, el traiem de la BD: pot tornar a entrar amb el mateix nom i no ocupa plaça
  if (room.state === "LOBBY" && ws.dbParticipantId) {
    jocService.sortirPartida(ws.dbParticipantId).catch((err) =>
      console.error("Error en treure el participant de la BD:", err.message),
    );
    ws.dbParticipantId = null;
  }

  if (room.players.length === 0) {
    if (room.countdownInterval) clearInterval(room.countdownInterval);
    clearTimeout(room.startTimeout);
    for (const id in room.sortidesPendents) clearTimeout(room.sortidesPendents[id]);
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
        players: getRoomPlayersPayload(room),
      }),
    );

    // si només faltava el que ha marxat, no deixem la votació o la ronda penjades
    if (room.state === "VOTING_CATEGORY" && Object.keys(room.categoryVotes).length >= room.players.length) {
      finishCategoryVote(room);
    }
    if (room.state === "VOTING" && Object.keys(room.answers).length >= room.players.length) {
      finishRound(room);
    }
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
