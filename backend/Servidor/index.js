import express from "express";
import http from "http";
import cors from "cors";
import { setupWebSocket } from "./ws/server.js";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Endpoint bàsic per comprovar que el servidor està actiu
app.get("/", (req, res) => {
  res.send("Servidor HOW MUCH?! LIVE funcionant correctament.");
});

// Inicialitzem el WebSocket server sobre el mateix servidor HTTP
setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor Express i WebSockets escoltant al port ${PORT}`);
});
