// Usuaris i estadístiques (ampliació "Estadístiques i historial") amb mysql2.
// L'usuari és el nom que escriu el jugador: si ja existeix, el reconeixem.
// (Els usuaris es creen a partidesRepo, quan algú crea o entra a una partida.)
const { consulta } = require("../utils/pool");
const { AppError } = require("../utils/errors");

// Resum d'un usuari, només amb les partides acabades
async function estadistiques(nom) {
  const files = await consulta(
    `SELECT u.id, u.nom, u.creat_el, u.ultima_partida_el,
            COUNT(DISTINCT pa.partida_id)                    AS partides_jugades,
            COALESCE(SUM(r.punts), 0)                        AS punts_totals,
            COUNT(r.id)                                      AS respostes,
            COALESCE(SUM(r.posicio = 1), 0)                  AS rondes_guanyades,
            COALESCE(SUM(r.valor = pr.resposta_correcta), 0) AS exactes
     FROM usuaris u
     LEFT JOIN participants pa ON pa.usuari_id = u.id
          AND pa.partida_id IN (SELECT id FROM partides WHERE estat = 'acabada')
     LEFT JOIN respostes r  ON r.participant_id = pa.id
     LEFT JOIN rondes ro    ON ro.id = r.ronda_id
     LEFT JOIN preguntes pr ON pr.id = ro.pregunta_id
     WHERE u.nom = ?
     GROUP BY u.id, u.nom, u.creat_el, u.ultima_partida_el`,
    [nom],
  );
  if (files.length === 0) throw new AppError("NOT_FOUND", "Aquest usuari no existeix");
  return files[0];
}

// Les partides acabades d'un usuari, amb els punts que hi va fer
async function historial(nom) {
  return consulta(
    `SELECT p.codi, p.num_rondes, p.acabada_el, pa.nom AS nom_a_la_partida,
            COALESCE(SUM(r.punts), 0) AS punts
     FROM usuaris u
     JOIN participants pa ON pa.usuari_id = u.id
     JOIN partides p      ON p.id = pa.partida_id
     LEFT JOIN respostes r ON r.participant_id = pa.id
     WHERE u.nom = ? AND p.estat = 'acabada'
     GROUP BY p.id, p.codi, p.num_rondes, p.acabada_el, pa.nom
     ORDER BY p.acabada_el DESC`,
    [nom],
  );
}

// Rànquing global: qui ha fet més punts sumant totes les partides acabades
async function ranking(limit = 10) {
  return consulta(
    `SELECT u.nom,
            COUNT(DISTINCT pa.partida_id) AS partides_jugades,
            COALESCE(SUM(r.punts), 0)     AS punts_totals
     FROM usuaris u
     JOIN participants pa ON pa.usuari_id = u.id
     JOIN partides p      ON p.id = pa.partida_id AND p.estat = 'acabada'
     LEFT JOIN respostes r ON r.participant_id = pa.id
     GROUP BY u.id, u.nom
     ORDER BY punts_totals DESC, partides_jugades DESC
     LIMIT ?`,
    [limit],
  );
}

module.exports = { estadistiques, historial, ranking };
