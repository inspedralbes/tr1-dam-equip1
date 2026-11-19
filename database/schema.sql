-- =====================================================================
-- HOW MUCH?! LIVE · Esquema de la base de dades
-- MariaDB · InnoDB · utf8mb4
--
-- És l'ÚNIC lloc on es creen les taules (ni el codi ni Sequelize les creen).
-- Amb Docker es carrega sol el primer cop que s'aixeca el volum de mariadb.
--
-- Què NO es desa (es calcula o viu a la memòria del servidor):
--   - Classificacions: SUM(respostes.punts) amb JOIN + GROUP BY
--   - Distància: ABS(respostes.valor - preguntes.resposta_correcta)
--   - Connexions, sockets, qui està votant ara mateix, el temporitzador
--
-- Transaccions (RAD-4), sempre amb ROLLBACK si falla alguna passa:
--   - Tancar ronda (atomicitat): rondes FOR UPDATE + UPDATE respostes + UPDATE rondes
--   - Unir-se (concurrència): partides FOR UPDATE, mirar estat i places, INSERT participants
--   - Respondre (concurrència): rondes FOR UPDATE, mirar que és oberta, INSERT respostes
-- =====================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS howmuch_live
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE howmuch_live;

-- Per poder tornar a executar l'script (ordre invers de dependències).
-- Compte: esborra totes les dades!
DROP TABLE IF EXISTS respostes, rondes, participants, partides, preguntes, categories, usuaris;

-- ---------------------------------------------------------------------
-- Usuaris (ampliació "Estadístiques i historial")
-- Serveix per reconèixer el mateix jugador d'una partida a l'altra.
-- No hi ha contrasenya: l'usuari és el nom que escriu a la pantalla d'inici.
-- ---------------------------------------------------------------------
CREATE TABLE usuaris (
  id                INT         NOT NULL AUTO_INCREMENT,
  nom               VARCHAR(30) NOT NULL,
  creat_el          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_partida_el DATETIME    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuaris_nom (nom),
  CONSTRAINT ck_usuaris_nom CHECK (CHAR_LENGTH(TRIM(nom)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Banc de preguntes (el gestiona Sequelize, però les taules es creen aquí)
-- Només es desa la resposta correcta. El rang del slider NO es desa: el
-- servidor el calcula a l'atzar cada cop que surt la pregunta, perquè la
-- resposta no quedi sempre al mateix lloc del slider.
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id  INT          NOT NULL AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_nom (nom),
  CONSTRAINT ck_categories_nom CHECK (CHAR_LENGTH(TRIM(nom)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE preguntes (
  id                INT          NOT NULL AUTO_INCREMENT,
  categoria_id      INT          NOT NULL,
  enunciat          VARCHAR(255) NOT NULL,
  resposta_correcta INT          NOT NULL,
  unitat            VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_preguntes_enunciat (enunciat),
  -- RESTRICT: no es pot esborrar una categoria que tingui preguntes
  CONSTRAINT fk_preguntes_categoria
    FOREIGN KEY (categoria_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_preguntes_unitat CHECK (CHAR_LENGTH(TRIM(unitat)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Partides i participants
-- codi: el número de sala que es comparteix (5 xifres, sense zero davant)
-- abandonada: tothom ha marxat abans d'acabar
--
-- El codi és únic entre les partides ACTIVES (esperant o en_curs).
-- Quan l'amfitrió fa "nova partida" a la mateixa sala, la partida nova
-- té el mateix codi i l'antiga ja està acabada, així que no xoquen.
-- Ho fa la columna calculada codi_actiu: val el codi si la partida està
-- activa i NULL si no (el UNIQUE deixa repetir els NULL).
-- ---------------------------------------------------------------------
CREATE TABLE partides (
  id           INT              NOT NULL AUTO_INCREMENT,
  codi         VARCHAR(5)       NOT NULL, -- VARCHAR i no CHAR: MariaDB no deixa fer servir CHAR a codi_actiu
  estat        ENUM('esperant','en_curs','acabada','abandonada') NOT NULL DEFAULT 'esperant',
  num_rondes   TINYINT UNSIGNED NOT NULL,
  max_jugadors TINYINT UNSIGNED NOT NULL,
  creada_el    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  iniciada_el  DATETIME         NULL,
  acabada_el   DATETIME         NULL,
  codi_actiu   VARCHAR(5) AS (IF(estat IN ('esperant', 'en_curs'), codi, NULL)) PERSISTENT,
  PRIMARY KEY (id),
  UNIQUE KEY uq_partides_codi_actiu (codi_actiu),
  KEY ix_partides_codi (codi),
  CONSTRAINT ck_partides_codi         CHECK (codi REGEXP '^[1-9][0-9]{4}$'),
  CONSTRAINT ck_partides_num_rondes   CHECK (num_rondes BETWEEN 1 AND 20),
  CONSTRAINT ck_partides_max_jugadors CHECK (max_jugadors BETWEEN 2 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- usuari_id pot ser NULL: si s'esborra l'usuari, la partida es manté igual
CREATE TABLE participants (
  id          INT         NOT NULL AUTO_INCREMENT,
  partida_id  INT         NOT NULL,
  usuari_id   INT         NULL,
  nom         VARCHAR(30) NOT NULL,
  es_amfitrio BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_participants_partida_nom (partida_id, nom),
  CONSTRAINT fk_participants_partida
    FOREIGN KEY (partida_id) REFERENCES partides (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_participants_usuari
    FOREIGN KEY (usuari_id) REFERENCES usuaris (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Rondes
-- Els dos UNIQUE fan que no es repeteixi ni el número ni la pregunta dins
-- d'una partida. L'estat és aquí perquè és la fila que es bloqueja (FOR UPDATE).
-- ---------------------------------------------------------------------
CREATE TABLE rondes (
  id          INT              NOT NULL AUTO_INCREMENT,
  partida_id  INT              NOT NULL,
  numero      TINYINT UNSIGNED NOT NULL,
  pregunta_id INT              NOT NULL,
  estat       ENUM('oberta','tancada') NOT NULL DEFAULT 'oberta',
  oberta_el   DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rondes_partida_numero   (partida_id, numero),
  UNIQUE KEY uq_rondes_partida_pregunta (partida_id, pregunta_id),
  CONSTRAINT fk_rondes_partida
    FOREIGN KEY (partida_id) REFERENCES partides (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rondes_pregunta
    FOREIGN KEY (pregunta_id) REFERENCES preguntes (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_rondes_numero CHECK (numero >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Respostes
-- UNIQUE (ronda, participant): només una resposta per jugador i ronda.
-- respost_el (amb mil·lisegons) i l'id diuen l'ordre: en cas d'empat guanya
-- qui ha respost abans.
-- posicio i punts són NULL mentre la ronda és oberta; els escriu el servidor
-- en tancar-la. Qui no respon no té fila (0 punts).
-- ---------------------------------------------------------------------
CREATE TABLE respostes (
  id             INT              NOT NULL AUTO_INCREMENT,
  ronda_id       INT              NOT NULL,
  participant_id INT              NOT NULL,
  valor          INT              NOT NULL,
  respost_el     DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
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
