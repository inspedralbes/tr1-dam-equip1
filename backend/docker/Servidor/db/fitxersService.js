import fs from 'fs/promises';
import { stringify } from 'csv-stringify/sync';
import { Categoria } from './models/Categoria.js';
import { Pregunta } from './models/Pregunta.js';
import { obtenirDetallPartida } from './jocService.js';

export function validarPregunta(pregunta, categoriesMap = {}) {
  const errors = [];

  if (!pregunta || typeof pregunta !== 'object') {
    return { valid: false, errors: ['El format de la pregunta no és un objecte vàlid'] };
  }

  if (!pregunta.enunciat || typeof pregunta.enunciat !== 'string' || pregunta.enunciat.trim() === '') {
    errors.push("L'enunciat és obligatori i no pot estar buit");
  }

  if (pregunta.resposta === undefined || pregunta.resposta === null || isNaN(Number(pregunta.resposta))) {
    errors.push('La resposta ha de ser un valor numèric vàlid');
  }

  if (!pregunta.unitat || typeof pregunta.unitat !== 'string' || pregunta.unitat.trim() === '') {
    errors.push('La unitat és obligatòria');
  }

  let catId = pregunta.categoria_id;
  if (!catId && pregunta.categoria) {
    catId = categoriesMap[String(pregunta.categoria).toLowerCase()];
  }
  if (!catId) {
    errors.push('La categoria especificada no existeix o no és vàlida');
  }

  if (pregunta.min_valor !== undefined && pregunta.max_valor !== undefined) {
    const min = Number(pregunta.min_valor);
    const max = Number(pregunta.max_valor);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push('El valor mínim no pot ser superior al valor màxim');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    categoria_id: catId,
  };
}

export async function processarArrayPreguntes(llistaPreguntes) {
  if (!Array.isArray(llistaPreguntes)) {
    const error = new Error('Les dades han de ser un array de preguntes');
    error.status = 400;
    throw error;
  }

  const categories = await Categoria.findAll();
  const categoriesMap = {};
  for (const cat of categories) {
    categoriesMap[cat.nom.toLowerCase()] = cat.id;
    categoriesMap[cat.id] = cat.id;
  }

  const importades = [];
  const descartades = [];

  for (const item of llistaPreguntes) {
    const validacio = validarPregunta(item, categoriesMap);

    if (!validacio.valid) {
      descartades.push({
        pregunta: item,
        motius: validacio.errors,
      });
      continue;
    }

    try {
      const creada = await Pregunta.create({
        categoria_id: validacio.categoria_id,
        enunciat: item.enunciat.trim(),
        resposta: Number(item.resposta),
        unitat: item.unitat.trim(),
        min_valor: item.min_valor !== undefined && item.min_valor !== '' ? Number(item.min_valor) : null,
        max_valor: item.max_valor !== undefined && item.max_valor !== '' ? Number(item.max_valor) : null,
      });
      importades.push(creada);
    } catch (err) {
      descartades.push({
        pregunta: item,
        motius: [err.message],
      });
    }
  }

  return {
    total: llistaPreguntes.length,
    importades: importades.length,
    descartades,
  };
}

export async function importarPreguntesJSON(input) {
  if (Array.isArray(input)) {
    return await processarArrayPreguntes(input);
  }

  let contingut;
  try {
    contingut = await fs.readFile(input, 'utf-8');
  } catch (err) {
    const error = new Error(`Error en llegir el fitxer: ${err.message}`);
    error.status = 400;
    throw error;
  }

  let llistaPreguntes;
  try {
    llistaPreguntes = JSON.parse(contingut);
  } catch (err) {
    const error = new Error(`Format JSON invàlid: ${err.message}`);
    error.status = 400;
    throw error;
  }

  return await processarArrayPreguntes(llistaPreguntes);
}

export async function exportarPartidaCSV(partidaId, outputPath = null) {
  const dades = await obtenirDetallPartida(partidaId);

  const files = [];

  files.push(['# PARTIDA HOW MUCH?! LIVE', dades.partida.codi, `Estat: ${dades.partida.estat}`, `Data: ${dades.partida.created_at}`]);
  files.push([]);

  files.push(['CLASSIFICACIÓ FINAL']);
  files.push(['Posició', 'Participant', 'Punts Totals']);
  dades.classificacio.forEach((jugador, index) => {
    files.push([index + 1, jugador.nom, jugador.punts_totals]);
  });
  files.push([]);

  files.push(['DETALL DE RESPOSTES PER RONDA']);
  files.push(['Ronda', 'Pregunta', 'Resposta Correcta', 'Unitat', 'Participant', 'Valor Estimat', 'Posició a Ronda', 'Punts Ronda']);

  const participantsMap = {};
  dades.participants.forEach(p => {
    participantsMap[p.id] = p.nom;
  });

  for (const ronda of dades.rondes) {
    const respostesRonda = dades.respostes.filter(r => r.ronda_id === ronda.id);
    if (respostesRonda.length === 0) {
      files.push([ronda.numero, ronda.enunciat, ronda.resposta, ronda.unitat, '(Sense respostes)', '', '', '']);
    } else {
      for (const res of respostesRonda) {
        files.push([
          ronda.numero,
          ronda.enunciat,
          ronda.resposta,
          ronda.unitat,
          participantsMap[res.participant_id] || res.participant_id,
          res.valor_estimat,
          res.posicio !== null ? res.posicio : '-',
          res.punts !== null ? res.punts : 0,
        ]);
      }
    }
  }

  const csvContent = stringify(files);

  if (outputPath) {
    await fs.writeFile(outputPath, csvContent, 'utf-8');
  }

  return {
    csv: csvContent,
    partidaId,
    outputPath,
  };
}
