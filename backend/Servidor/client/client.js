const WebSocket = require("ws");

// Cambia esto por la URL de tu servidor y el código de sala que te dé Unity
const URL = "ws://localhost:3000";
const ROOM_ID = "6174";
const PLAYER_NAME = "BotDePrueba";

const ws = new WebSocket(URL);

ws.on("open", () => {
  console.log("Conectado al servidor. Uniéndose a la sala...");

  const payload = {
    type: "joinRoom",
    roomId: ROOM_ID,
    name: PLAYER_NAME,
  };

  ws.send(JSON.stringify(payload));
  console.log("Enviado:", JSON.stringify(payload));
});

ws.on("message", (data) => {
  console.log("Respuesta del servidor:", data.toString());
});

ws.on("error", (err) => console.error("Error:", err.message));
