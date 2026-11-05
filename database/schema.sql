-- =====================================================================
-- HOW MUCH?! LIVE · Esquema de la base de dades
-- MariaDB · InnoDB · utf8mb4
--
-- No es desa (es calcula o viu a la memòria del servidor):
--   - Classificacions (acumulada i final): SUM(respostes.punts)
--   - Distància: ABS(respostes.valor - preguntes.resposta_correcta)
--   - Connexions i qui ha respost durant la ronda
--
-- RAD-4 · Operacions transaccionals (sempre amb ROLLBACK si algun pas falla):
--   - Tancar ronda (atomicitat): SELECT ... FROM rondes WHERE id=? FOR UPDATE,
--     UPDATE de posicio i punts de totes les respostes i
--     UPDATE rondes SET estat='tancada'.
--   - Unir-se a partida (concurrència): SELECT ... FROM partides WHERE id=?
--     FOR UPDATE, comprovar estat='esperant' i INSERT INTO participants.
--   - Respondre (concurrència): SELECT ... FROM rondes WHERE id=? FOR UPDATE,
--     comprovar estat='oberta' i INSERT INTO respostes.
-- Per això rondes.estat és a la BD: és la fila que es bloqueja i es comprova.
-- =====================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS howmuch_live
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE howmuch_live;

-- Permet tornar a executar l'script (esborra en ordre invers de dependència).
-- Compte: elimina totes les dades!
DROP TABLE IF EXISTS respostes, rondes, participants, partides, preguntes, categories;

-- ---------------------------------------------------------------------
-- Categories i preguntes
-- La unitat i l'escala (p. ex. "milions de persones") van a l'enunciat.
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id  INT          NOT NULL AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE preguntes (
  id                INT          NOT NULL AUTO_INCREMENT,
  categoria_id      INT          NOT NULL,
  enunciat          VARCHAR(255) NOT NULL,
  resposta_correcta INT          NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_preguntes_categoria
    FOREIGN KEY (categoria_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Partides i participants
-- ---------------------------------------------------------------------
CREATE TABLE partides (
  id          INT                                   NOT NULL AUTO_INCREMENT,
  codi        CHAR(6)                               NOT NULL,
  estat       ENUM('esperant','en_curs','acabada')  NOT NULL DEFAULT 'esperant',
  num_rondes  TINYINT UNSIGNED                      NOT NULL,
  creada_el   DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  iniciada_el DATETIME                              NULL,
  acabada_el  DATETIME                              NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_partides_codi (codi),
  CONSTRAINT ck_partides_num_rondes CHECK (num_rondes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE participants (
  id          INT         NOT NULL AUTO_INCREMENT,
  partida_id  INT         NOT NULL,
  nom         VARCHAR(30) NOT NULL,
  es_amfitrio BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_participants_partida_nom (partida_id, nom),
  CONSTRAINT fk_participants_partida
    FOREIGN KEY (partida_id) REFERENCES partides (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Rondes
-- ---------------------------------------------------------------------
CREATE TABLE rondes (
  id          INT              NOT NULL AUTO_INCREMENT,
  partida_id  INT              NOT NULL,
  numero      TINYINT UNSIGNED NOT NULL,
  pregunta_id INT              NOT NULL,
  estat       ENUM('oberta','tancada') NOT NULL DEFAULT 'oberta',
  PRIMARY KEY (id),
  UNIQUE KEY uq_rondes_partida_numero  (partida_id, numero),
  UNIQUE KEY uq_rondes_partida_pregunta (partida_id, pregunta_id),
  CONSTRAINT fk_rondes_partida
    FOREIGN KEY (partida_id) REFERENCES partides (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rondes_pregunta
    FOREIGN KEY (pregunta_id) REFERENCES preguntes (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Respostes
-- posicio i punts són NULL mentre la ronda és oberta (rondes.estat) i els
-- escriu el servidor en tancar-la, dins la mateixa transacció. Qui no respon no
-- té fila (0 punts a la classificació).
-- ---------------------------------------------------------------------
CREATE TABLE respostes (
  id             INT              NOT NULL AUTO_INCREMENT,
  ronda_id       INT              NOT NULL,
  participant_id INT              NOT NULL,
  valor          INT              NOT NULL,
  posicio        TINYINT UNSIGNED NULL,
  punts          TINYINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_respostes_ronda_participant (ronda_id, participant_id),
  CONSTRAINT fk_respostes_ronda
    FOREIGN KEY (ronda_id) REFERENCES rondes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_respostes_participant
    FOREIGN KEY (participant_id) REFERENCES participants (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_respostes_posicio CHECK (posicio IS NULL OR posicio >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;