-- ============================================================
--  Script d'inicialització de la base de dades
--  S'executa automàticament el primer cop que arrenca el contenidor
--  (ja sobre la BDD definida a MARIADB_DATABASE).
-- ============================================================

SET NAMES utf8mb4;

-- ---------- TAULES ----------
CREATE TABLE IF NOT EXISTS preguntes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titol       VARCHAR(200)  NOT NULL,
    resposta    INT(150)  NOT NULL,
    inici       INT(150)  NOT NULL,
    final       INT(150)  NOT NULL,
    data_creada    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- DADES DE PROVA ----------
INSERT INTO preguntes (titol, resposta, inici, final) VALUES
    ('Quantes persones viuen a fuentealbilla', 76, 0, 100),
    ('Quants kilometres mesura el guadalquivir', 624, 500, 1000),
    ('Quin percentatge de la superfície de Catalunya és de muntanya?', 35, 0, 100);