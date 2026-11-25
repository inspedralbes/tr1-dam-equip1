-- =======================================================
-- HOW MUCH?! LIVE - Esquema de la base de dades (01-schema.sql)
-- RAD-1 / T2: Claus primàries, claus foranes, UNIQUE, NOT NULL i CHECK
-- =======================================================

CREATE DATABASE IF NOT EXISTS howmuch;
USE howmuch;

DROP TABLE IF EXISTS respostes;
DROP TABLE IF EXISTS rondes;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS partides;
DROP TABLE IF EXISTS preguntes;
DROP TABLE IF EXISTS categories;

-- 1. Categories de preguntes
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    CONSTRAINT uq_categories_nom UNIQUE (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Banc de preguntes
CREATE TABLE preguntes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    enunciat TEXT NOT NULL,
    resposta DECIMAL(14, 2) NOT NULL,
    unitat VARCHAR(50) NOT NULL,
    min_valor DECIMAL(14, 2) DEFAULT NULL,
    max_valor DECIMAL(14, 2) DEFAULT NULL,
    CONSTRAINT fk_preguntes_categoria FOREIGN KEY (categoria_id) 
        REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_preguntes_min_max CHECK (min_valor IS NULL OR max_valor IS NULL OR min_valor <= max_valor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Partides
CREATE TABLE partides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codi VARCHAR(10) NOT NULL,
    estat ENUM('esperant', 'en_curs', 'acabada') NOT NULL DEFAULT 'esperant',
    max_jugadors INT NOT NULL DEFAULT 10,
    total_rondes INT NOT NULL DEFAULT 5,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_partides_codi UNIQUE (codi),
    CONSTRAINT chk_partides_max_jugadors CHECK (max_jugadors > 0),
    CONSTRAINT chk_partides_total_rondes CHECK (total_rondes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Participants per partida
CREATE TABLE participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    nom VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_participants_partida FOREIGN KEY (partida_id) 
        REFERENCES partides(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_participants_partida_nom UNIQUE (partida_id, nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Rondes d'una partida
CREATE TABLE rondes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    numero INT NOT NULL,
    pregunta_id INT NOT NULL,
    estat ENUM('oberta', 'tancada') NOT NULL DEFAULT 'oberta',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rondes_partida FOREIGN KEY (partida_id) 
        REFERENCES partides(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rondes_pregunta FOREIGN KEY (pregunta_id) 
        REFERENCES preguntes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_rondes_partida_numero UNIQUE (partida_id, numero),
    CONSTRAINT chk_rondes_numero CHECK (numero > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Respostes dels participants a cada ronda
CREATE TABLE respostes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_id INT NOT NULL,
    ronda_id INT NOT NULL,
    valor_estimat DECIMAL(14, 2) NOT NULL,
    posicio INT DEFAULT NULL,
    punts INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_respostes_participant FOREIGN KEY (participant_id) 
        REFERENCES participants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_respostes_ronda FOREIGN KEY (ronda_id) 
        REFERENCES rondes(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_respostes_participant_ronda UNIQUE (participant_id, ronda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
