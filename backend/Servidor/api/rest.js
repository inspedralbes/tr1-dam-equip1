// Endpoints REST (/api/...). Només reben la petició, criden la capa de dades i responen.
// La capa de dades (bdd/) és CommonJS: des d'aquí (ES modules) s'importa amb import x from
import express from "express";
import pool from "../bdd/utils/pool.js";
import preguntesRepo from "../bdd/data/preguntesRepo.js";
import partidesRepo from "../bdd/data/partidesRepo.js";
import usuarisRepo from "../bdd/data/usuarisRepo.js";
import fitxers from "../bdd/data/fitxers.js";
import errors from "../bdd/utils/errors.js";

const router = express.Router();

// Quin codi HTTP toca per a cada error del joc
const estatsHttp = {
  NOT_FOUND: 404,
  INVALID_DATA: 400,
  INVALID_JSON: 400,
  DUPLICATE: 409,
  CATEGORY_HAS_QUESTIONS: 409,
  HAS_DEPENDENCIES: 409,
  GAME_NOT_FINISHED: 409,
  DB_UNAVAILABLE: 503,
};

function enviarError(res, error) {
  const estat = estatsHttp[error.code];
  if (estat) {
    return res.status(estat).json({ error: error.code, message: error.message });
  }
  // error que no esperàvem: el mostrem al log i al client li diem el mínim
  const { titol, solucio } = errors.explicarError(error);
  console.error(`[API] ${titol} -> ${solucio}`);
  res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
}

// Per no repetir el try/catch a cada ruta
function ruta(funcio) {
  return async (req, res) => {
    try {
      await funcio(req, res);
    } catch (error) {
      enviarError(res, error);
    }
  };
}

// ---------------- Estat ----------------
router.get("/health", ruta(async (req, res) => {
  await pool.consulta("SELECT 1");
  res.json({ ok: true, db: "connectada" });
}));

// ---------------- Categories (Sequelize) ----------------
router.get("/categories", ruta(async (req, res) => {
  res.json(await preguntesRepo.llistarCategories());
}));

router.get("/categories/:id", ruta(async (req, res) => {
  res.json(await preguntesRepo.obtenirCategoria(req.params.id));
}));

router.post("/categories", ruta(async (req, res) => {
  res.status(201).json(await preguntesRepo.crearCategoria(req.body.nom));
}));

router.put("/categories/:id", ruta(async (req, res) => {
  res.json(await preguntesRepo.actualitzarCategoria(req.params.id, req.body.nom));
}));

router.delete("/categories/:id", ruta(async (req, res) => {
  await preguntesRepo.esborrarCategoria(req.params.id);
  res.status(204).end();
}));

// ---------------- Preguntes (Sequelize) ----------------
// GET /api/preguntes?categoria=3
router.get("/preguntes", ruta(async (req, res) => {
  res.json(await preguntesRepo.llistarPreguntes(req.query.categoria));
}));

// Importar preguntes: el body és la mateixa llista que el JSON de database/preguntes-exemple.json
router.post("/preguntes/importar", ruta(async (req, res) => {
  res.json(await fitxers.importarLlista(req.body));
}));

router.get("/preguntes/:id", ruta(async (req, res) => {
  res.json(await preguntesRepo.obtenirPregunta(req.params.id));
}));

router.post("/preguntes", ruta(async (req, res) => {
  res.status(201).json(await preguntesRepo.crearPregunta(req.body));
}));

router.put("/preguntes/:id", ruta(async (req, res) => {
  res.json(await preguntesRepo.actualitzarPregunta(req.params.id, req.body));
}));

router.delete("/preguntes/:id", ruta(async (req, res) => {
  await preguntesRepo.esborrarPregunta(req.params.id);
  res.status(204).end();
}));

// ---------------- Partides (mysql2) ----------------
// Dades de la partida + classificació (acumulada o final)
router.get("/partides/:codi", ruta(async (req, res) => {
  const partida = await partidesRepo.buscarPartida(req.params.codi);
  const classificacio = await partidesRepo.classificacio(partida.id);
  res.json({ ...partida, classificacio });
}));

// Descarregar la partida en CSV (només si està acabada)
router.get("/partides/:codi/csv", ruta(async (req, res) => {
  const csv = await fitxers.exportarPartidaCsv(req.params.codi);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="partida-${req.params.codi}.csv"`);
  res.send(csv);
}));

// ---------------- Usuaris i estadístiques (mysql2) ----------------
router.get("/usuaris/ranking", ruta(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  res.json(await usuarisRepo.ranking(limit));
}));

router.get("/usuaris/:nom", ruta(async (req, res) => {
  const estadistiques = await usuarisRepo.estadistiques(req.params.nom);
  const historial = await usuarisRepo.historial(req.params.nom);
  res.json({ ...estadistiques, historial });
}));

export default router;
