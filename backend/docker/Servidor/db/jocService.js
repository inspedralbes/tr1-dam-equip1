import { pool } from './mysql.js';

export async function crearPartida(codi, maxJugadors = 10, totalRondes = 5) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO partides (codi, max_jugadors, total_rondes, estat) VALUES (?, ?, ?, "esperant")',
      [codi, maxJugadors, totalRondes]
    );
    return {
      id: result.insertId,
      codi,
      maxJugadors,
      totalRondes,
      estat: 'esperant',
    };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Ja existeix una partida amb aquest codi');
      error.status = 409;
      error.code = 'ROOM_ALREADY_EXISTS';
      throw error;
    }
    throw err;
  }
}

export async function obtenirPartidaPerCodi(codi) {
  const [rows] = await pool.execute('SELECT * FROM partides WHERE codi = ?', [codi]);
  return rows[0] || null;
}

export async function obtenirPartidaPerId(id) {
  const [rows] = await pool.execute('SELECT * FROM partides WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function obtenirPartides() {
  const [rows] = await pool.execute(
    'SELECT id, codi, estat, max_jugadors, total_rondes, created_at FROM partides ORDER BY id DESC LIMIT 50'
  );
  return rows;
}

export async function iniciarPartida(partidaId) {
  await pool.execute('UPDATE partides SET estat = "en_curs" WHERE id = ?', [partidaId]);
  return { id: partidaId, estat: 'en_curs' };
}

export async function acabarPartida(partidaId) {
  await pool.execute('UPDATE partides SET estat = "acabada" WHERE id = ?', [partidaId]);
  return { id: partidaId, estat: 'acabada' };
}

export async function unirsePartida(codi, nom) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [partides] = await conn.execute(
      'SELECT id, estat, max_jugadors FROM partides WHERE codi = ? FOR UPDATE',
      [codi]
    );

    if (partides.length === 0) {
      const error = new Error('No existeix cap sala amb aquest codi');
      error.status = 404;
      error.code = 'ROOM_NOT_FOUND';
      throw error;
    }

    const partida = partides[0];
    if (partida.estat !== 'esperant') {
      const error = new Error('La partida ja ha començat');
      error.status = 400;
      error.code = 'GAME_NOT_ACCEPTING_PLAYERS';
      throw error;
    }

    const [nomExistent] = await conn.execute(
      'SELECT id FROM participants WHERE partida_id = ? AND LOWER(nom) = LOWER(?)',
      [partida.id, nom]
    );
    if (nomExistent.length > 0) {
      const error = new Error('Aquest nom ja està en ús a la sala');
      error.status = 409;
      error.code = 'NAME_TAKEN';
      throw error;
    }

    const [countRows] = await conn.execute(
      'SELECT COUNT(*) AS total FROM participants WHERE partida_id = ?',
      [partida.id]
    );

    if (countRows[0].total >= partida.max_jugadors) {
      const error = new Error('La sala està plena');
      error.status = 400;
      error.code = 'ROOM_FULL';
      throw error;
    }

    const [result] = await conn.execute(
      'INSERT INTO participants (partida_id, nom) VALUES (?, ?)',
      [partida.id, nom]
    );

    await conn.commit();
    return {
      id: result.insertId,
      partida_id: partida.id,
      nom,
    };
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Aquest nom ja està en ús a la sala');
      error.status = 409;
      error.code = 'NAME_TAKEN';
      throw error;
    }
    throw err;
  } finally {
    conn.release();
  }
}

export async function obtenirParticipants(partidaId) {
  const [rows] = await pool.execute(
    'SELECT id, nom, created_at FROM participants WHERE partida_id = ? ORDER BY id ASC',
    [partidaId]
  );
  return rows;
}

export async function sortirPartida(participantId) {
  if (!participantId) return;
  await pool.execute('DELETE FROM participants WHERE id = ?', [participantId]);
}

export async function reiniciarPartida(anteriorPartidaId, codi, maxJugadors = 10, totalRondes = 5, jugadorsActuals = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [prevRows] = await conn.execute(
      'SELECT id, estat FROM partides WHERE id = ? OR codi = ? FOR UPDATE',
      [anteriorPartidaId || 0, codi]
    );

    for (const row of prevRows) {
      const archivedCode = `${String(codi).slice(0, 5)}#${row.id.toString(36)}`.slice(0, 10);
      await conn.execute(
        'UPDATE partides SET codi = ?, estat = IF(estat = "esperant", "acabada", estat) WHERE id = ?',
        [archivedCode, row.id]
      );
    }

    const [insPartida] = await conn.execute(
      'INSERT INTO partides (codi, max_jugadors, total_rondes, estat) VALUES (?, ?, ?, "esperant")',
      [codi, maxJugadors, totalRondes]
    );
    const novaPartidaId = insPartida.insertId;

    const participantsMap = {};
    for (const p of jugadorsActuals) {
      const [insPart] = await conn.execute(
        'INSERT INTO participants (partida_id, nom) VALUES (?, ?)',
        [novaPartidaId, p.name]
      );
      participantsMap[p.id] = insPart.insertId;
    }

    await conn.commit();
    return {
      id: novaPartidaId,
      participantsMap,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function obtenirPreguntesDisponibles(partidaId, categoriaId = null) {
  let query = `
    SELECT p.*, c.nom AS categoria_nom 
    FROM preguntes p
    JOIN categories c ON p.categoria_id = c.id
    WHERE p.id NOT IN (
      SELECT pregunta_id FROM rondes WHERE partida_id = ?
    )
  `;
  const params = [partidaId];

  if (categoriaId) {
    query += ' AND p.categoria_id = ?';
    params.push(categoriaId);
  }

  const [rows] = await pool.execute(query, params);
  return rows;
}

export async function crearRonda(partidaId, numero, preguntaId) {
  const [result] = await pool.execute(
    'INSERT INTO rondes (partida_id, numero, pregunta_id, estat) VALUES (?, ?, ?, "oberta")',
    [partidaId, numero, preguntaId]
  );
  return {
    id: result.insertId,
    partida_id: partidaId,
    numero,
    pregunta_id: preguntaId,
    estat: 'oberta',
  };
}

export async function obtenirRondaActual(partidaId) {
  const [rows] = await pool.execute(
    `SELECT r.*, p.enunciat, p.resposta, p.unitat, p.min_valor, p.max_valor, c.nom AS categoria_nom
     FROM rondes r
     JOIN preguntes p ON r.pregunta_id = p.id
     JOIN categories c ON p.categoria_id = c.id
     WHERE r.partida_id = ?
     ORDER BY r.numero DESC LIMIT 1`,
    [partidaId]
  );
  return rows[0] || null;
}

export async function respondreRonda(participantId, rondaId, valorEstimat) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rondes] = await conn.execute(
      'SELECT id, estat FROM rondes WHERE id = ? FOR UPDATE',
      [rondaId]
    );

    if (rondes.length === 0) {
      const error = new Error('Ronda no trobada');
      error.status = 404;
      error.code = 'ROUND_NOT_FOUND';
      throw error;
    }

    if (rondes[0].estat !== 'oberta') {
      const error = new Error('La ronda està tancada');
      error.status = 400;
      error.code = 'ROUND_CLOSED';
      throw error;
    }

    const [result] = await conn.execute(
      'INSERT INTO respostes (participant_id, ronda_id, valor_estimat) VALUES (?, ?, ?)',
      [participantId, rondaId, valorEstimat]
    );

    await conn.commit();
    return {
      id: result.insertId,
      participant_id: participantId,
      ronda_id: rondaId,
      valor_estimat: valorEstimat,
    };
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error('Una segona resposta a la mateixa ronda es rebutja');
      error.status = 409;
      error.code = 'ALREADY_ANSWERED';
      throw error;
    }
    throw err;
  } finally {
    conn.release();
  }
}

export async function tancarRonda(rondaId, respostesPuntuades) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rondes] = await conn.execute(
      'SELECT id, estat FROM rondes WHERE id = ? FOR UPDATE',
      [rondaId]
    );

    if (rondes.length === 0) {
      const error = new Error('Ronda no trobada');
      error.status = 404;
      error.code = 'ROUND_NOT_FOUND';
      throw error;
    }

    if (rondes[0].estat !== 'oberta') {
      const error = new Error('La ronda ja està tancada');
      error.status = 400;
      error.code = 'ROUND_ALREADY_CLOSED';
      throw error;
    }

    for (const item of respostesPuntuades) {
      await conn.execute(
        'UPDATE respostes SET posicio = ?, punts = ? WHERE ronda_id = ? AND participant_id = ?',
        [item.posicio, item.punts, rondaId, item.participant_id]
      );
    }

    await conn.execute('UPDATE rondes SET estat = "tancada" WHERE id = ?', [rondaId]);

    await conn.commit();
    return { success: true, ronda_id: rondaId, estat: 'tancada' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function obtenirClassificacio(partidaId) {
  const [rows] = await pool.execute(
    `SELECT 
       p.id AS participant_id,
       p.nom,
       COALESCE(SUM(r.punts), 0) AS punts_totals
     FROM participants p
     LEFT JOIN respostes r ON p.id = r.participant_id
     WHERE p.partida_id = ?
     GROUP BY p.id, p.nom
     ORDER BY punts_totals DESC, p.id ASC`,
    [partidaId]
  );
  return rows;
}

export async function obtenirDetallPartida(partidaId) {
  const partida = await obtenirPartidaPerId(partidaId);
  if (!partida) {
    const error = new Error('Partida no trobada');
    error.status = 404;
    throw error;
  }

  const [participants] = await pool.execute(
    'SELECT id, nom FROM participants WHERE partida_id = ? ORDER BY id ASC',
    [partidaId]
  );

  const [rondes] = await pool.execute(
    `SELECT r.id, r.numero, r.estat, p.enunciat, p.resposta, p.unitat 
     FROM rondes r
     JOIN preguntes p ON r.pregunta_id = p.id
     WHERE r.partida_id = ?
     ORDER BY r.numero ASC`,
    [partidaId]
  );

  const [respostes] = await pool.execute(
    `SELECT res.ronda_id, res.participant_id, res.valor_estimat, res.posicio, res.punts
     FROM respostes res
     JOIN rondes r ON res.ronda_id = r.id
     WHERE r.partida_id = ?`,
    [partidaId]
  );

  const classificacio = await obtenirClassificacio(partidaId);

  return {
    partida,
    participants,
    rondes,
    respostes,
    classificacio,
  };
}
