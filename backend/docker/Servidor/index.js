import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { setupWebSocket } from './ws/server.js';
import * as preguntesService from './db/preguntesService.js';
import * as jocService from './db/jocService.js';
import * as fitxersService from './db/fitxersService.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Endpoint per al healthcheck de docker
app.get('/', (req, res) => {
  res.send('Servidor How Much?! LIVE funcionant');
});

// ==========================================
// RAD-2: CRUD Banc de Preguntes (Sequelize)
// ==========================================

// Categories
app.get('/api/categories', async (req, res, next) => {
  try {
    const categories = await preguntesService.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

app.get('/api/categories/:id', async (req, res, next) => {
  try {
    const categoria = await preguntesService.getCategoriaById(req.params.id);
    res.json(categoria);
  } catch (err) {
    next(err);
  }
});

app.post('/api/categories', async (req, res, next) => {
  try {
    const { nom } = req.body;
    if (!nom || String(nom).trim() === '') {
      return res.status(400).json({ error: 'El camp nom és obligatori' });
    }
    const nova = await preguntesService.createCategoria(String(nom).trim());
    res.status(201).json(nova);
  } catch (err) {
    next(err);
  }
});

app.put('/api/categories/:id', async (req, res, next) => {
  try {
    const { nom } = req.body;
    if (!nom || String(nom).trim() === '') {
      return res.status(400).json({ error: 'El camp nom és obligatori' });
    }
    const mod = await preguntesService.updateCategoria(req.params.id, String(nom).trim());
    res.json(mod);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/categories/:id', async (req, res, next) => {
  try {
    const result = await preguntesService.deleteCategoria(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Preguntes
app.get('/api/preguntes', async (req, res, next) => {
  try {
    const categoriaId = req.query.categoria_id ? parseInt(req.query.categoria_id, 10) : null;
    const preguntes = await preguntesService.getPreguntes(categoriaId);
    res.json(preguntes);
  } catch (err) {
    next(err);
  }
});

app.get('/api/preguntes/:id', async (req, res, next) => {
  try {
    const pregunta = await preguntesService.getPreguntaById(req.params.id);
    res.json(pregunta);
  } catch (err) {
    next(err);
  }
});

app.post('/api/preguntes', async (req, res, next) => {
  try {
    const nova = await preguntesService.createPregunta(req.body);
    res.status(201).json(nova);
  } catch (err) {
    next(err);
  }
});

app.put('/api/preguntes/:id', async (req, res, next) => {
  try {
    const mod = await preguntesService.updatePregunta(req.params.id, req.body);
    res.json(mod);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/preguntes/:id', async (req, res, next) => {
  try {
    const result = await preguntesService.deletePregunta(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RAD-5: Fitxers JSON i CSV (RA1)
// ==========================================

// Importar preguntes des de fitxer o cos JSON
app.post('/api/preguntes/importar', async (req, res, next) => {
  try {
    const { fitxerPath, preguntes } = req.body;
    let input = preguntes || fitxerPath;
    if (!input && Array.isArray(req.body)) {
      input = req.body;
    }
    if (!input) {
      return res.status(400).json({ error: 'Cal indicar fitxerPath o enviar un array de preguntes al camp "preguntes"' });
    }
    const resultat = await fitxersService.importarPreguntesJSON(input);
    res.json(resultat);
  } catch (err) {
    next(err);
  }
});

// Llistar partides per a l'exportació CSV
app.get('/api/partides', async (req, res, next) => {
  try {
    const partides = await jocService.obtenirPartides();
    res.json(partides);
  } catch (err) {
    next(err);
  }
});

// Exportar partida acabada a CSV (RAD-5)
app.get('/api/partides/:id/exportar-csv', async (req, res, next) => {
  try {
    const partidaId = parseInt(req.params.id, 10);
    const { csv } = await fitxersService.exportarPartidaCSV(partidaId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="partida-${partidaId}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Classificació acumulada o final (RAD-3)
app.get('/api/partides/:id/classificacio', async (req, res, next) => {
  try {
    const partidaId = parseInt(req.params.id, 10);
    const classificacio = await jocService.obtenirClassificacio(partidaId);
    res.json(classificacio);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RAD-6: Gestió centralitzada d'errors
// ==========================================
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.message);

  if (err.name === 'SequelizeUniqueConstraintError' || err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registre ja existeix o està duplicat', codi: 'DUPLICATE_ENTRY' });
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({ error: 'Error de validació', detalls: errors });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ error: 'Restricció d\'integritat referencial: no es pot modificar/esborrar', codi: 'FK_CONSTRAINT' });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Error intern del servidor',
    codi: err.code || 'INTERNAL_ERROR',
  });
});

// Configurem el servidor de websockets
setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escoltant al port ${PORT}`);
});
