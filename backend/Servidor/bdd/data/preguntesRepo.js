// CRUD del banc de preguntes amb Sequelize (el fa servir l'admin de Vue/Electron).
const { sequelize, Categoria, Pregunta } = require("./sequelize");
const { AppError, traduirError } = require("../utils/errors");

// ---------------- Categories ----------------

// Totes les categories amb quantes preguntes té cadascuna (include + COUNT)
async function llistarCategories() {
  try {
    return await Categoria.findAll({
      attributes: ["id", "nom", [sequelize.fn("COUNT", sequelize.col("preguntes.id")), "num_preguntes"]],
      include: [{ model: Pregunta, as: "preguntes", attributes: [] }],
      group: ["Categoria.id", "Categoria.nom"],
      order: [["nom", "ASC"]],
    });
  } catch (error) {
    throw traduirError(error);
  }
}

// n categories a l'atzar que tinguin preguntes (per a la votació)
async function categoriesAleatories(n) {
  try {
    const categories = await Categoria.findAll({
      include: [{ model: Pregunta, as: "preguntes", attributes: [], required: true }],
      group: ["Categoria.id", "Categoria.nom"],
      order: sequelize.random(),
    });
    return categories.slice(0, n).map((c) => c.nom);
  } catch (error) {
    throw traduirError(error);
  }
}

async function obtenirCategoria(id) {
  try {
    const categoria = await Categoria.findByPk(id, {
      include: [{ model: Pregunta, as: "preguntes" }],
    });
    if (!categoria) throw new AppError("NOT_FOUND", "La categoria no existeix");
    return categoria;
  } catch (error) {
    throw traduirError(error);
  }
}

async function crearCategoria(nom) {
  try {
    return await Categoria.create({ nom: (nom || "").trim() });
  } catch (error) {
    throw traduirError(error);
  }
}

async function actualitzarCategoria(id, nom) {
  try {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) throw new AppError("NOT_FOUND", "La categoria no existeix");
    categoria.nom = (nom || "").trim();
    await categoria.save();
    return categoria;
  } catch (error) {
    throw traduirError(error);
  }
}

// No es pot esborrar una categoria amb preguntes.
// Ho mirem abans per donar un missatge clar (i la FK amb RESTRICT ho bloquejaria igualment).
async function esborrarCategoria(id) {
  try {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) throw new AppError("NOT_FOUND", "La categoria no existeix");

    const quantes = await Pregunta.count({ where: { categoria_id: id } });
    if (quantes > 0) {
      throw new AppError("CATEGORY_HAS_QUESTIONS", `No es pot esborrar: té ${quantes} preguntes`);
    }
    await categoria.destroy();
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      throw new AppError("CATEGORY_HAS_QUESTIONS", "No es pot esborrar: la categoria té preguntes");
    }
    throw traduirError(error);
  }
}

// ---------------- Preguntes ----------------

// Totes les preguntes (o les d'una categoria) amb el nom de la categoria (include)
async function llistarPreguntes(categoriaId) {
  try {
    const where = categoriaId ? { categoria_id: categoriaId } : {};
    return await Pregunta.findAll({
      where,
      include: [{ model: Categoria, as: "categoria", attributes: ["id", "nom"] }],
      order: [["id", "ASC"]],
    });
  } catch (error) {
    throw traduirError(error);
  }
}

async function obtenirPregunta(id) {
  try {
    const pregunta = await Pregunta.findByPk(id, {
      include: [{ model: Categoria, as: "categoria", attributes: ["id", "nom"] }],
    });
    if (!pregunta) throw new AppError("NOT_FOUND", "La pregunta no existeix");
    return pregunta;
  } catch (error) {
    throw traduirError(error);
  }
}

// dades: { categoria_id, enunciat, resposta_correcta, unitat }
async function crearPregunta(dades) {
  try {
    const categoria = await Categoria.findByPk(dades.categoria_id);
    if (!categoria) throw new AppError("NOT_FOUND", "La categoria no existeix");
    return await Pregunta.create(dades);
  } catch (error) {
    throw traduirError(error);
  }
}

async function actualitzarPregunta(id, dades) {
  try {
    const pregunta = await Pregunta.findByPk(id);
    if (!pregunta) throw new AppError("NOT_FOUND", "La pregunta no existeix");
    if (dades.categoria_id !== undefined) {
      const categoria = await Categoria.findByPk(dades.categoria_id);
      if (!categoria) throw new AppError("NOT_FOUND", "La categoria no existeix");
    }
    await pregunta.update(dades, {
      fields: ["categoria_id", "enunciat", "resposta_correcta", "unitat"],
    });
    return pregunta;
  } catch (error) {
    throw traduirError(error);
  }
}

// Si la pregunta ja s'ha jugat en alguna ronda, la FK no deixa esborrar-la
async function esborrarPregunta(id) {
  try {
    const pregunta = await Pregunta.findByPk(id);
    if (!pregunta) throw new AppError("NOT_FOUND", "La pregunta no existeix");
    await pregunta.destroy();
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      throw new AppError("HAS_DEPENDENCIES", "No es pot esborrar: aquesta pregunta ja s'ha jugat en alguna partida");
    }
    throw traduirError(error);
  }
}

module.exports = {
  llistarCategories,
  categoriesAleatories,
  obtenirCategoria,
  crearCategoria,
  actualitzarCategoria,
  esborrarCategoria,
  llistarPreguntes,
  obtenirPregunta,
  crearPregunta,
  actualitzarPregunta,
  esborrarPregunta,
};
