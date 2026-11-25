import { Categoria } from "./models/Categoria.js";
import { Pregunta } from "./models/Pregunta.js";

export async function getCategories() {
  return await Categoria.findAll({
    order: [["nom", "ASC"]],
  });
}

export async function getCategoriaById(id) {
  const categoria = await Categoria.findByPk(id, {
    include: [{ model: Pregunta, as: "preguntes" }],
  });
  if (!categoria) {
    const error = new Error("Categoria no trobada");
    error.status = 404;
    throw error;
  }
  return categoria;
}

export async function createCategoria(nom) {
  return await Categoria.create({ nom });
}

export async function updateCategoria(id, nom) {
  const categoria = await Categoria.findByPk(id);
  if (!categoria) {
    const error = new Error("Categoria no trobada");
    error.status = 404;
    throw error;
  }
  categoria.nom = nom;
  await categoria.save();
  return categoria;
}

export async function deleteCategoria(id) {
  const categoria = await Categoria.findByPk(id);
  if (!categoria) {
    const error = new Error("Categoria no trobada");
    error.status = 404;
    throw error;
  }

  const totalPreguntes = await Pregunta.count({ where: { categoria_id: id } });
  if (totalPreguntes > 0) {
    const error = new Error(
      "No es pot esborrar una categoria que té preguntes associades",
    );
    error.status = 400;
    error.code = "CATEGORY_HAS_QUESTIONS";
    throw error;
  }

  await categoria.destroy();
  return { deleted: true, id };
}

export async function getPreguntes(categoriaId = null) {
  const options = {
    include: [{ model: Categoria, as: "categoria", attributes: ["id", "nom"] }],
    order: [["id", "ASC"]],
  };

  if (categoriaId) {
    options.where = { categoria_id: categoriaId };
  }

  return await Pregunta.findAll(options);
}

export async function getPreguntaById(id) {
  const pregunta = await Pregunta.findByPk(id, {
    include: [{ model: Categoria, as: "categoria", attributes: ["id", "nom"] }],
  });
  if (!pregunta) {
    const error = new Error("Pregunta no trobada");
    error.status = 404;
    throw error;
  }
  return pregunta;
}

export async function createPregunta(data) {
  const categoria = await Categoria.findByPk(data.categoria_id);
  if (!categoria) {
    const error = new Error("La categoria especificada no existeix");
    error.status = 400;
    throw error;
  }

  return await Pregunta.create({
    categoria_id: data.categoria_id,
    enunciat: data.enunciat,
    resposta: data.resposta,
    unitat: data.unitat,
    min_valor: data.min_valor !== undefined ? data.min_valor : null,
    max_valor: data.max_valor !== undefined ? data.max_valor : null,
  });
}

export async function updatePregunta(id, data) {
  const pregunta = await Pregunta.findByPk(id);
  if (!pregunta) {
    const error = new Error("Pregunta no trobada");
    error.status = 404;
    throw error;
  }

  if (data.categoria_id) {
    const categoria = await Categoria.findByPk(data.categoria_id);
    if (!categoria) {
      const error = new Error("La categoria especificada no existeix");
      error.status = 400;
      throw error;
    }
    pregunta.categoria_id = data.categoria_id;
  }

  if (data.enunciat !== undefined) pregunta.enunciat = data.enunciat;
  if (data.resposta !== undefined) pregunta.resposta = data.resposta;
  if (data.unitat !== undefined) pregunta.unitat = data.unitat;
  if (data.min_valor !== undefined) pregunta.min_valor = data.min_valor;
  if (data.max_valor !== undefined) pregunta.max_valor = data.max_valor;

  await pregunta.save();
  return pregunta;
}

export async function deletePregunta(id) {
  const pregunta = await Pregunta.findByPk(id);
  if (!pregunta) {
    const error = new Error("Pregunta no trobada");
    error.status = 404;
    throw error;
  }
  await pregunta.destroy();
  return { deleted: true, id };
}
