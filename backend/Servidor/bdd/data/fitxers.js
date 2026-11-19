// Fitxers (RAD-5): importar preguntes des de JSON i exportar una partida a CSV.
const fs = require("fs").promises;
const { stringify } = require("csv-stringify/sync");
const { Categoria, Pregunta } = require("./sequelize");
const partidesRepo = require("./partidesRepo");
const { AppError } = require("../utils/errors");

// Format de cada pregunta del JSON (mira database/preguntes-exemple.json):
// { "categoria": "Geografia", "enunciat": "...", "resposta": 580, "unitat": "km" }
// (el rang del slider no va aquí: el calcula el servidor a cada ronda)
function validarPregunta(p) {
  const errors = [];
  if (typeof p !== "object" || p === null) {
    return { valid: false, errors: ["no és un objecte"] };
  }
  if (typeof p.categoria !== "string" || !p.categoria.trim()) errors.push("categoria buida");
  if (typeof p.enunciat !== "string" || p.enunciat.trim().length < 5) errors.push("enunciat buit o massa curt");
  else if (p.enunciat.length > 255) errors.push("enunciat de més de 255 caràcters");
  if (!Number.isInteger(p.resposta)) errors.push("resposta no és un número enter");
  if (typeof p.unitat !== "string" || !p.unitat.trim()) errors.push("unitat buida");
  return { valid: errors.length === 0, errors };
}

// Desa una llista de preguntes ja llegida. Les invàlides o repetides es descarten.
// Si la categoria no existeix, es crea.
// Retorna { importades, descartades: [{ index, enunciat, errors }] }
async function importarLlista(llista) {
  if (!Array.isArray(llista)) throw new AppError("INVALID_DATA", "El JSON ha de ser una llista de preguntes");

  let importades = 0;
  const descartades = [];

  for (let i = 0; i < llista.length; i++) {
    const p = llista[i];
    const { valid, errors } = validarPregunta(p);
    if (!valid) {
      descartades.push({ index: i, enunciat: p?.enunciat ?? null, errors });
      continue;
    }

    try {
      const [categoria] = await Categoria.findOrCreate({ where: { nom: p.categoria.trim() } });
      await Pregunta.create({
        categoria_id: categoria.id,
        enunciat: p.enunciat.trim(),
        resposta_correcta: p.resposta,
        unitat: p.unitat.trim(),
      });
      importades++;
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        descartades.push({ index: i, enunciat: p.enunciat, errors: ["aquesta pregunta ja existeix"] });
      } else if (error.name === "SequelizeValidationError") {
        descartades.push({ index: i, enunciat: p.enunciat, errors: error.errors.map((e) => e.message) });
      } else {
        throw error;
      }
    }
  }

  return { importades, descartades };
}

// Llegeix el fitxer amb fs.promises i l'importa
async function importarPreguntes(ruta) {
  let text;
  try {
    text = await fs.readFile(ruta, "utf8");
  } catch (error) {
    throw new AppError("FILE_NOT_FOUND", `No es pot llegir el fitxer ${ruta}`);
  }

  let llista;
  try {
    llista = JSON.parse(text);
  } catch (error) {
    throw new AppError("INVALID_JSON", "El fitxer no és un JSON vàlid: " + error.message);
  }

  return importarLlista(llista);
}

// CSV d'una partida acabada: totes les respostes i, a sota, la classificació final
async function exportarPartidaCsv(codi) {
  // l'última partida acabada amb aquest codi (una sala pot haver jugat diverses partides)
  let partida;
  try {
    partida = await partidesRepo.buscarPartida(codi, "acabada");
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      throw new AppError("GAME_NOT_FINISHED", "No hi ha cap partida acabada amb aquest codi");
    }
    throw error;
  }

  const respostes = await partidesRepo.respostesPartida(partida.id);
  const classificacio = await partidesRepo.classificacio(partida.id);

  const csvRespostes = stringify(
    respostes.map((r) => ({
      ronda: r.ronda,
      categoria: r.categoria,
      pregunta: r.enunciat,
      correcta: r.resposta_correcta,
      unitat: r.unitat,
      participant: r.participant,
      estimacio: r.valor,
      diferencia: r.diferencia,
      posicio: r.posicio,
      punts: r.punts,
    })),
    { header: true },
  );

  const csvClassificacio = stringify(
    classificacio.map((c, i) => ({
      posicio: i + 1,
      participant: c.nom,
      punts: c.punts,
      rondes_guanyades: c.rondes_guanyades,
      exactes: c.exactes,
    })),
    { header: true },
  );

  return `Partida,${partida.codi}\n\n${csvRespostes}\nClassificació final\n${csvClassificacio}`;
}

module.exports = { validarPregunta, importarLlista, importarPreguntes, exportarPartidaCsv };
