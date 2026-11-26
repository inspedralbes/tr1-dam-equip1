import { defineStore } from "pinia";
import { ref } from "vue";
import { useRoomStore } from "@/stores/room";
import { useGameStore } from "@/stores/game";
import { usePlayerStore } from "@/stores/player";

// Sessió de la partida (servidor + codi de sala + token secret) per poder tornar-hi si es recarrega la pàgina.
// sessionStorage: sobreviu a una recàrrega però és de cada pestanya (es pot provar amb diverses pestanyes)
const CLAU_SESSIO = "howmuch-sessio";

function guardarSessio(missatge, host) {
  if (!missatge.token) return;
  sessionStorage.setItem(
    CLAU_SESSIO,
    JSON.stringify({ host, roomId: missatge.roomId, token: missatge.token }),
  );
}

function esborrarSessio() {
  sessionStorage.removeItem(CLAU_SESSIO);
}

export function hiHaSessioGuardada() {
  return sessionStorage.getItem(CLAU_SESSIO) !== null;
}

const PROD_SERVER_HOST = import.meta.env.VITE_SERVER_HOST || "2.31.112.198";

export const isElectronFile = () =>
  typeof window !== "undefined" && window.location.protocol === "file:";

export function getDefaultServerHost() {
  if (typeof window === "undefined") return PROD_SERVER_HOST;
  if (isElectronFile()) {
    return PROD_SERVER_HOST;
  }
  // En mode dev/preview local (npm run dev / vite preview) apuntem al servidor real, no a localhost
  if (window.location.port === "5173" || window.location.port === "4173") {
    return PROD_SERVER_HOST;
  }
  return window.location.host || PROD_SERVER_HOST;
}

export function normalizeServerInput(raw) {
  const clean = String(raw || "").trim().replace(/\/+$/, "");
  return clean || getDefaultServerHost();
}

export function buildWsUrl(rawInput) {
  if (import.meta.env.VITE_WS_URL && isElectronFile()) {
    return import.meta.env.VITE_WS_URL;
  }
  const val = normalizeServerInput(rawInput);
  if (/^wss?:\/\//i.test(val)) return val;
  if (/^https?:\/\//i.test(val)) return val.replace(/^http/i, "ws");
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return `${isHttps ? "wss" : "ws"}://${val}`;
}

export function buildApiUrl(rawInput) {
  if (import.meta.env.VITE_API_URL && isElectronFile()) {
    return import.meta.env.VITE_API_URL;
  }
  const val = normalizeServerInput(rawInput);
  if (/^https?:\/\//i.test(val)) return val;
  if (/^wss?:\/\//i.test(val)) return val.replace(/^ws/i, "http");
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return `${isHttps ? "https" : "http"}://${val}`;
}

export const useConnectionStore = defineStore("connection", () => {
  const estat = ref("desconnectat");
  const errorServidor = ref(null);
  const serverHost = ref(getDefaultServerHost());
  let socket = null;
  let promesaConnexio = null;
  let urlActual = "";
  let acabarReconnexio = null; // es crida quan el servidor confirma (o rebutja) la reconnexió

  function setServerHost(host) {
    const clean = normalizeServerInput(host);
    if (clean !== serverHost.value) {
      serverHost.value = clean;
      if (socket) {
        socket.close();
        socket = null;
        promesaConnexio = null;
      }
    }
  }

  function connectar(customHost = null) {
    if (customHost) {
      setServerHost(customHost);
    }

    const targetUrl = buildWsUrl(serverHost.value);
    if (promesaConnexio && urlActual === targetUrl && socket && socket.readyState !== WebSocket.CLOSED) {
      return promesaConnexio;
    }

    if (socket) {
      socket.close();
      socket = null;
    }

    urlActual = targetUrl;
    promesaConnexio = new Promise((resolve, reject) => {
      estat.value = "connectant";
      socket = new WebSocket(targetUrl);

      socket.onopen = () => {
        estat.value = "connectat";
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const missatge = JSON.parse(event.data);
          gestionarMissatge(missatge);
        } catch (e) {
          console.error("Missatge no vàlid", event.data, e);
        }
      };

      socket.onerror = () => {
        promesaConnexio = null;
        reject(new Error(`No s'ha pogut connectar amb el servidor (${targetUrl})`));
      };

      socket.onclose = () => {
        estat.value = "desconnectat";
        socket = null;
        promesaConnexio = null;
      };
    });

    return promesaConnexio;
  }

  function enviar(missatge) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("No es pot enviar: no hi ha connexió");
      return false;
    }
    socket.send(JSON.stringify(missatge));
    return true;
  }

  // Botó "Sortir": avisem el servidor perquè ens tregui ja (si no, ens guardaria el lloc uns segons)
  function desconnectar() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leaveRoom" }));
    }
    esborrarSessio();
    if (socket) socket.close();
  }

  // Després de recarregar: tornem a entrar a la partida amb el token guardat.
  // Retorna una promesa: true si hem tornat a la partida, false si no.
  function reconnectar() {
    const text = sessionStorage.getItem(CLAU_SESSIO);
    if (!text) return Promise.resolve(false);
    const sessio = JSON.parse(text);

    return new Promise((resolve) => {
      const temps = setTimeout(() => acabar(false), 5000); // si el servidor no contesta

      function acabar(ok) {
        clearTimeout(temps);
        acabarReconnexio = null;
        if (!ok) esborrarSessio();
        resolve(ok);
      }
      acabarReconnexio = acabar;

      connectar(sessio.host)
        .then(() =>
          enviar({ type: "reconnect", roomId: sessio.roomId, token: sessio.token }),
        )
        .catch(() => acabar(false));
    });
  }

  function gestionarMissatge(missatge) {
    const room = useRoomStore();
    const game = useGameStore();

    switch (missatge.type) {
      case "roomCreated":
      case "roomJoined":
        room.entrarSala(missatge);
        guardarSessio(missatge, serverHost.value);
        // després de recarregar el nom s'havia perdut (les pantalles el fan servir per saber qui ets)
        if (missatge.name) usePlayerStore().registrarNom(missatge.name);
        break;
      case "reconnected":
        if (acabarReconnexio) acabarReconnexio(true);
        break;
      case "playerJoined":
      case "playerLeft":
        room.actualitzarParticipants(missatge.players);
        break;
      case "categoryVoteStarted":
        game.iniciarVotacioCategories(missatge);
        break;
      case "categoryVoted":
        game.registrarVot(missatge);
        break;
      case "categorySelected":
        game.categoriaTriada(missatge);
        break;
      case "error":
        if (missatge.code === "RECONNECT_FAILED") {
          if (acabarReconnexio) acabarReconnexio(false);
          break;
        }
        errorServidor.value = {
          code: missatge.code,
          message: missatge.message,
        };
        break;
      case "roundStarted":
        game.iniciarRonda(missatge);
        break;
      case "playerVoted":
        game.registrarResposta(missatge);
        break;
      case "timerStarted":
        game.iniciarCompteEnrere(missatge.seconds);
        break;
      case "roundResults":
        game.mostrarResultats(missatge);
        break;
      case "gameOver":
        game.acabarPartida(missatge);
        break;
      case "gameRestarted":
        room.actualitzarParticipants(missatge.players);
        game.reiniciar();
        break;
      default:
        console.warn("Missatge desconegut", missatge);
    }
  }

  return {
    estat,
    errorServidor,
    serverHost,
    setServerHost,
    connectar,
    enviar,
    desconnectar,
    reconnectar,
  };
});
