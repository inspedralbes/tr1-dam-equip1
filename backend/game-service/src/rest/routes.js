// API REST. Només tradueix HTTP <-> crides a game/ i data/ (sense lògica pròpia).
const express = require('express');
const RoomManager = require('../game/RoomManager');
const preguntesRepo = require('../data/preguntesRepo');

const router = express.Router();

// Estat del servei (el fa servir el healthcheck de Docker i l'eina de microserveis)
router.get('/health', async (req, res) => {
  try {
    await preguntesRepo.comprovarConnexio();
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    res.json(await preguntesRepo.llistarCategories());
  } catch (err) {
    next(err);
  }
});

router.get('/rooms', (req, res) => {
  res.json(RoomManager.listRooms());
});

// Informació inicial d'una sala (Unity la demana amb UnityWebRequest abans de connectar-se)
router.get('/rooms/:code', (req, res) => {
  res.json(RoomManager.getRoom(req.params.code).summary());
});

module.exports = router;
