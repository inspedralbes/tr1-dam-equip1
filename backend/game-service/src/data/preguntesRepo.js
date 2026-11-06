// Accés a les preguntes amb mysql2 (consultes parametritzades amb ?).
// Més endavant la capa d'Accés a Dades hi afegirà partides, rondes i respostes.
const pool = require('./pool');

async function comprovarConnexio() {
  await pool.query('SELECT 1');
}

async function llistarCategories() {
  const [rows] = await pool.query('SELECT id, nom FROM categories ORDER BY nom');
  return rows;
}

// Tria una pregunta a l'atzar que no s'hagi fet servir encara a la partida.
async function preguntaAleatoria(idsExclosos = []) {
  const excloure = idsExclosos.length ? idsExclosos : [0];
  const marques = excloure.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT p.id, p.enunciat, p.resposta_correcta, c.nom AS categoria
       FROM preguntes p
       JOIN categories c ON c.id = p.categoria_id
      WHERE p.id NOT IN (${marques})
      ORDER BY RAND()
      LIMIT 1`,
    excloure
  );
  return rows[0] || null;
}

module.exports = { comprovarConnexio, llistarCategories, preguntaAleatoria };
