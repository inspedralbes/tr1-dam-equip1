// Partides, participants, rondes i respostes (mysql2).
// Aquí no hi ha cap console.log: les funcions tornen un resultat o llancen un error.
const { consulta, obtenirConnexio } = require("../utils/pool");
const { AppError, traduirError } = require("../utils/errors");

// Codi de sala de 5 xifres, sense zero davant (10000-99999).
// El document de definició diu 6: si es canvia, cal tocar també el CHECK de schema.sql
function generarCodi() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

// Id de l'usuari amb aquest nom; si no existeix, el crea (ampliació estadístiques).
// LAST_INSERT_ID(id) fa que insertId sigui l'id de la fila que ja hi era.
async function idUsuari(connection, nom) {
  const [res] = await connection.execute(
    `INSERT INTO usuaris (nom, ultima_partida_el) VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), ultima_partida_el = NOW()`,
    [nom],
  );
  return res.insertId;
}

// Crea una partida amb l'amfitrió dins (transacció: o tot o res).
// El codi el posa la BD: el UNIQUE garanteix que no hi ha dues partides actives
// amb el mateix codi. Si surt repetit, en provem un altre.
// Retorna { partidaId, codi, participantId }
async function crearPartida(numRondes, maxJugadors, nomAmfitrio) {
  const connection = await obtenirConnexio();
  try {
    await connection.beginTransaction();

    let partidaId = null;
    let codi = null;
    for (let intent = 0; intent < 5 && partidaId === null; intent++) {
      codi = generarCodi();
      try {
        const [res] = await connection.execute(
          "INSERT INTO partides (codi, num_rondes, max_jugadors) VALUES (?, ?, ?)",
          [codi, numRondes, maxJugadors],
        );
        partidaId = res.insertId;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
      }
    }
    if (partidaId === null) throw new AppError("CODE_TAKEN", "No s'ha pogut generar un codi de sala");

    const usuariId = await idUsuari(connection, nomAmfitrio);
    const [res] = await connection.execute(
      "INSERT INTO participants (partida_id, usuari_id, nom, es_amfitrio) VALUES (?, ?, ?, TRUE)",
      [partidaId, usuariId, nomAmfitrio],
    );

    await connection.commit();
    return { partidaId, codi, participantId: res.insertId };
  } catch (error) {
    await connection.rollback();
    throw traduirError(error);
  } finally {
    connection.release();
  }
}

// Unir-se a una partida (transacció per concurrència).
// El FOR UPDATE bloqueja la fila de la partida: si l'amfitrió la comença o
// entra un altre jugador alhora, s'han d'esperar que acabem.
// nom = el de la sala (pot ser "Pol (2)"), nomUsuari = el que ha escrit
async function unirParticipant(partidaId, nom, nomUsuari) {
  const connection = await obtenirConnexio();
  try {
    await connection.beginTransaction();

    const [partides] = await connection.execute(
      "SELECT estat, max_jugadors FROM partides WHERE id = ? FOR UPDATE",
      [partidaId],
    );
    if (partides.length === 0) throw new AppError("NOT_FOUND", "La sala no existeix");
    if (partides[0].estat !== "esperant")
      throw new AppError("GAME_ALREADY_STARTED", "La partida ja ha començat");

    const [comptes] = await connection.execute(
      "SELECT COUNT(*) AS total FROM participants WHERE partida_id = ?",
      [partidaId],
    );
    if (comptes[0].total >= partides[0].max_jugadors)
      throw new AppError("ROOM_FULL", "La sala està plena");

    const usuariId = await idUsuari(connection, nomUsuari || nom);
    const [res] = await connection.execute(
      "INSERT INTO participants (partida_id, usuari_id, nom) VALUES (?, ?, ?)",
      [partidaId, usuariId, nom],
    );

    await connection.commit();
    return res.insertId;
  } catch (error) {
    await connection.rollback();
    throw traduirError(error);
  } finally {
    connection.release();
  }
}

// Si algú marxa de la sala d'espera, l'esborrem (encara no té respostes).
// Si la partida ja ha començat, el deixem: les seves respostes compten a l'historial.
async function treureParticipant(participantId) {
  await consulta(
    `DELETE pa FROM participants pa
     JOIN partides p ON p.id = pa.partida_id
     WHERE pa.id = ? AND p.estat = 'esperant'`,
    [participantId],
  );
}

async function canviarAmfitrio(partidaId, participantId) {
  await consulta(
    "UPDATE participants SET es_amfitrio = (id = ?) WHERE partida_id = ?",
    [participantId, partidaId],
  );
}

async function iniciarPartida(partidaId) {
  await consulta(
    "UPDATE partides SET estat = 'en_curs', iniciada_el = NOW() WHERE id = ? AND estat = 'esperant'",
    [partidaId],
  );
}

async function acabarPartida(partidaId) {
  await consulta(
    "UPDATE partides SET estat = 'acabada', acabada_el = NOW() WHERE id = ? AND estat = 'en_curs'",
    [partidaId],
  );
}

// Tothom ha marxat. Si no s'havia començat no val la pena guardar-la;
// si estava a mitges, la marquem com a abandonada.
async function abandonarPartida(partidaId) {
  await consulta("DELETE FROM partides WHERE id = ? AND estat = 'esperant'", [partidaId]);
  await consulta("UPDATE partides SET estat = 'abandonada' WHERE id = ? AND estat = 'en_curs'", [partidaId]);
}

// "Nova partida" a la mateixa sala: partida nova amb el MATEIX codi i els
// jugadors que hi ha ara (transacció: o tot o res).
// Si l'antiga no havia acabat, passa a abandonada (així deixa lliure el codi).
// noms: els noms dels jugadors que queden a la sala
// Retorna { partidaId, participantIds: { nom: id } }
async function reiniciarPartida(partidaIdAntiga, noms) {
  const connection = await obtenirConnexio();
  try {
    await connection.beginTransaction();

    const [partides] = await connection.execute(
      "SELECT codi, num_rondes, max_jugadors FROM partides WHERE id = ? FOR UPDATE",
      [partidaIdAntiga],
    );
    if (partides.length === 0) throw new AppError("NOT_FOUND", "La partida no existeix");
    const antiga = partides[0];

    await connection.execute(
      "UPDATE partides SET estat = 'abandonada' WHERE id = ? AND estat IN ('esperant', 'en_curs')",
      [partidaIdAntiga],
    );

    const [res] = await connection.execute(
      "INSERT INTO partides (codi, num_rondes, max_jugadors) VALUES (?, ?, ?)",
      [antiga.codi, antiga.num_rondes, antiga.max_jugadors],
    );
    const partidaId = res.insertId;

    // copiem els participants (amb el seu usuari i qui és l'amfitrió) de la partida antiga
    const participantIds = {};
    for (const nom of noms) {
      const [ins] = await connection.execute(
        `INSERT INTO participants (partida_id, usuari_id, nom, es_amfitrio)
         SELECT ?, usuari_id, nom, es_amfitrio FROM participants WHERE partida_id = ? AND nom = ?`,
        [partidaId, partidaIdAntiga, nom],
      );
      if (ins.affectedRows > 0) participantIds[nom] = ins.insertId;
    }

    await connection.commit();
    return { partidaId, participantIds };
  } catch (error) {
    await connection.rollback();
    throw traduirError(error);
  } finally {
    connection.release();
  }
}

// Obre una ronda amb una pregunta de la categoria que no hagi sortit en aquesta partida.
// Si ja s'han fet totes les de la categoria, n'agafa una de qualsevol altra.
// Retorna { rondaId, pregunta: { id, text, answer, unit, categoria } }
async function obrirRonda(partidaId, numero, nomCategoria) {
  const sqlBase = `
    SELECT p.id, p.enunciat, p.resposta_correcta, p.unitat, c.nom AS categoria
    FROM preguntes p
    JOIN categories c ON c.id = p.categoria_id
    WHERE p.id NOT IN (SELECT pregunta_id FROM rondes WHERE partida_id = ?)`;

  let preguntes = await consulta(sqlBase + " AND c.nom = ? ORDER BY RAND() LIMIT 1", [partidaId, nomCategoria]);
  if (preguntes.length === 0) {
    preguntes = await consulta(sqlBase + " ORDER BY RAND() LIMIT 1", [partidaId]);
  }
  if (preguntes.length === 0) throw new AppError("NO_QUESTIONS", "No queden preguntes per jugar");

  const p = preguntes[0];
  try {
    const res = await consulta(
      "INSERT INTO rondes (partida_id, numero, pregunta_id) VALUES (?, ?, ?)",
      [partidaId, numero, p.id],
    );
    return {
      rondaId: res.insertId,
      pregunta: { id: p.id, text: p.enunciat, answer: p.resposta_correcta, unit: p.unitat, categoria: p.categoria },
    };
  } catch (error) {
    throw traduirError(error);
  }
}

// Respondre (transacció per concurrència).
// Bloquegem la ronda: si s'està tancant alhora, o la resposta entra abans
// i es puntua, o arriba després i es rebutja. Mai queda desada sense punts.
async function respondre(rondaId, participantId, valor) {
  const connection = await obtenirConnexio();
  try {
    await connection.beginTransaction();

    const [rondes] = await connection.execute(
      "SELECT estat FROM rondes WHERE id = ? FOR UPDATE",
      [rondaId],
    );
    if (rondes.length === 0) throw new AppError("NOT_FOUND", "La ronda no existeix");
    if (rondes[0].estat !== "oberta") throw new AppError("ROUND_CLOSED", "La ronda ja està tancada");

    // si ja havia respost, salta el UNIQUE (ronda_id, participant_id)
    await connection.execute(
      "INSERT INTO respostes (ronda_id, participant_id, valor) VALUES (?, ?, ?)",
      [rondaId, participantId, valor],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw traduirError(error);
  } finally {
    connection.release();
  }
}

// Tancar ronda (transacció per atomicitat).
// Desa la posició i els punts que ha calculat el servidor per a cada resposta
// i marca la ronda com a tancada. Si peta a mitges, rollback: no queden
// respostes sense punts ni rondes tancades sense puntuar.
// puntuacions: [{ participantId, posicio, punts }]
async function tancarRonda(rondaId, puntuacions) {
  const connection = await obtenirConnexio();
  try {
    await connection.beginTransaction();

    const [rondes] = await connection.execute(
      "SELECT estat FROM rondes WHERE id = ? FOR UPDATE",
      [rondaId],
    );
    if (rondes.length === 0) throw new AppError("NOT_FOUND", "La ronda no existeix");
    if (rondes[0].estat === "tancada") {
      await connection.commit(); // ja estava tancada: no fem res
      return;
    }

    for (const p of puntuacions) {
      await connection.execute(
        "UPDATE respostes SET posicio = ?, punts = ? WHERE ronda_id = ? AND participant_id = ?",
        [p.posicio, p.punts, rondaId, p.participantId],
      );
    }
    // les que no surten a la llista (algú que ha marxat o ha arribat just al tancar): 0 punts
    await connection.execute(
      "UPDATE respostes SET punts = 0 WHERE ronda_id = ? AND punts IS NULL",
      [rondaId],
    );
    await connection.execute("UPDATE rondes SET estat = 'tancada' WHERE id = ?", [rondaId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw traduirError(error);
  } finally {
    connection.release();
  }
}

// ---------------- Consultes ----------------

// Si hi ha diverses partides amb el codi (sala reiniciada), la més nova.
// Amb estat (p. ex. 'acabada'), la més nova que estigui en aquest estat.
async function buscarPartida(codi, estat) {
  let sql = `SELECT id, codi, estat, num_rondes, max_jugadors, creada_el, iniciada_el, acabada_el
             FROM partides WHERE codi = ?`;
  const params = [codi];
  if (estat) {
    sql += " AND estat = ?";
    params.push(estat);
  }
  const files = await consulta(sql + " ORDER BY id DESC LIMIT 1", params);
  if (files.length === 0) throw new AppError("NOT_FOUND", "No hi ha cap partida amb aquest codi");
  return files[0];
}

// Classificació acumulada (o final si la partida ha acabat). No es desa enlloc: es calcula.
async function classificacio(partidaId) {
  return consulta(
    `SELECT pa.id, pa.nom, pa.es_amfitrio,
            COALESCE(SUM(r.punts), 0)                       AS punts,
            COUNT(r.id)                                     AS respostes,
            COALESCE(SUM(r.posicio = 1), 0)                 AS rondes_guanyades,
            COALESCE(SUM(r.valor = p.resposta_correcta), 0) AS exactes
     FROM participants pa
     LEFT JOIN respostes r ON r.participant_id = pa.id
     LEFT JOIN rondes ro   ON ro.id = r.ronda_id
     LEFT JOIN preguntes p ON p.id = ro.pregunta_id
     WHERE pa.partida_id = ?
     GROUP BY pa.id, pa.nom, pa.es_amfitrio
     ORDER BY punts DESC, exactes DESC, pa.nom`,
    [partidaId],
  );
}

// Totes les respostes d'una partida (per exportar-la a CSV)
async function respostesPartida(partidaId) {
  return consulta(
    `SELECT ro.numero AS ronda, c.nom AS categoria, p.enunciat, p.resposta_correcta, p.unitat,
            pa.nom AS participant, r.valor, ABS(r.valor - p.resposta_correcta) AS diferencia,
            r.posicio, r.punts, r.respost_el
     FROM rondes ro
     JOIN preguntes p     ON p.id = ro.pregunta_id
     JOIN categories c    ON c.id = p.categoria_id
     JOIN respostes r     ON r.ronda_id = ro.id
     JOIN participants pa ON pa.id = r.participant_id
     WHERE ro.partida_id = ?
     ORDER BY ro.numero, r.posicio`,
    [partidaId],
  );
}

module.exports = {
  crearPartida,
  unirParticipant,
  treureParticipant,
  canviarAmfitrio,
  iniciarPartida,
  acabarPartida,
  abandonarPartida,
  reiniciarPartida,
  obrirRonda,
  respondre,
  tancarRonda,
  buscarPartida,
  classificacio,
  respostesPartida,
};
