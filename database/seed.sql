-- =====================================================================
-- HOW MUCH?! LIVE · Dades inicials
--
-- 1) Preguntes base (totes amb resposta entera; la unitat va a l'enunciat)
-- 2) Tres partides d'exemple, una per a cada estat:
--      ABC123  acabada   3 rondes jugades i puntuades
--      QWE456  en_curs   ronda 1 oberta (posicio i punts encara NULL)
--      XYZ789  esperant  només sala d'espera, sense rondes
--
-- El fitxer ha d'estar en UTF-8 (accents) i comença amb SET NAMES.
-- =====================================================================

SET NAMES utf8mb4;
USE howmuch_live;

-- ---------------------------------------------------------------------
-- 1) Categories i preguntes
-- ---------------------------------------------------------------------
INSERT INTO categories (id, nom) VALUES
  (1, 'Geografia'),
  (2, 'Ciència'),
  (3, 'Història'),
  (4, 'Cultura general');

INSERT INTO preguntes (id, categoria_id, enunciat, resposta_correcta) VALUES
  (1,  1, 'Quants quilòmetres mesura aproximadament l''equador terrestre?', 40075),
  (2,  1, 'Quants metres d''altitud té l''Everest, el cim més alt del món?', 8849),
  (3,  1, 'Quants estats són membres de l''Organització de les Nacions Unides (ONU)?', 193),
  (4,  2, 'Quants ossos té el cos d''una persona adulta?', 206),
  (5,  2, 'Quants elements químics hi ha a la taula periòdica?', 118),
  (6,  2, 'Quants quilòmetres per segon recorre la llum al buit?', 299792),
  (7,  2, 'Quants milers de quilòmetres hi ha, de mitjana, entre la Terra i la Lluna?', 384),
  (8,  2, 'A quants graus centígrads es troba el zero absolut (arrodonit a l''enter)?', -273),
  (9,  3, 'En quin any va arribar l''home a la Lluna per primera vegada?', 1969),
  (10, 3, 'En quin any va caure el Mur de Berlín?', 1989),
  (11, 3, 'Quants anys va durar la Guerra dels Cent Anys?', 116),
  (12, 4, 'Quantes tecles té un piano estàndard?', 88),
  (13, 4, 'Quantes fitxes té un joc de dòmino estàndard (doble sis)?', 28),
  (14, 4, 'Quants metres de llarg fa una piscina olímpica?', 50);

-- ---------------------------------------------------------------------
-- 2) Partides d'exemple
-- ---------------------------------------------------------------------
INSERT INTO partides (id, codi, estat, num_rondes, creada_el, iniciada_el, acabada_el) VALUES
  (1, 'ABC123', 'acabada',  3, '2026-11-03 17:00:00', '2026-11-03 17:05:00', '2026-11-03 17:20:00'),
  (2, 'QWE456', 'en_curs',  3, '2026-11-05 08:00:00', '2026-11-05 08:04:00', NULL),
  (3, 'XYZ789', 'esperant', 5, '2026-11-05 08:10:00', NULL,                  NULL);

INSERT INTO participants (id, partida_id, nom, es_amfitrio) VALUES
  (1, 1, 'Mercè',  1),
  (2, 1, 'Jordi',  0),
  (3, 1, 'Núria',  0),
  (4, 1, 'Pau',    0),
  (5, 2, 'Aina',   1),
  (6, 2, 'Roger',  0),
  (7, 2, 'Sílvia', 0),
  (8, 3, 'Laia',   1),
  (9, 3, 'Marc',   0);

INSERT INTO rondes (id, partida_id, numero, pregunta_id, estat) VALUES
  (1, 1, 1, 1,  'tancada'),  -- ABC123 · ronda 1 · equador
  (2, 1, 2, 4,  'tancada'),  -- ABC123 · ronda 2 · ossos
  (3, 1, 3, 9,  'tancada'),  -- ABC123 · ronda 3 · arribada a la Lluna
  (4, 2, 1, 12, 'oberta');   -- QWE456 · ronda 1 · piano

-- Regles de puntuació: 1a posició 3 punts, 2a 2, 3a 1, resposta exacta +2.
-- Empat: comparteixen posició i punts; la següent posició és
-- 1 + nombre de participants amb distància estrictament menor.
-- Qui no respon no té fila (0 punts).
INSERT INTO respostes (id, ronda_id, participant_id, valor, posicio, punts) VALUES
  -- Ronda 1 (correcta: 40075). Mercè l'encerta exacta (3 + 2 = 5)
  (1,  1, 1, 40075, 1, 5),
  (2,  1, 2, 40000, 2, 2),
  (3,  1, 4, 50000, 3, 1),
  (4,  1, 3, 30000, 4, 0),
  -- Ronda 2 (correcta: 206). Empat a distància 6: tots dos són 1rs (3 punts);
  -- Núria queda 3a perquè 2 participants són més a prop. Pau no respon.
  (5,  2, 1, 200,   1, 3),
  (6,  2, 2, 212,   1, 3),
  (7,  2, 3, 150,   3, 1),
  -- Ronda 3 (correcta: 1969). Mercè exacta (5); Jordi i Núria empaten a 2n
  -- (2 punts cadascun); Pau és 4t perquè 3 participants són més a prop.
  (8,  3, 1, 1969,  1, 5),
  (9,  3, 2, 1970,  2, 2),
  (10, 3, 3, 1968,  2, 2),
  (11, 3, 4, 1950,  4, 0),
  -- Ronda oberta de QWE456 (correcta: 88): encara sense posició ni punts
  (12, 4, 5, 90,    NULL, NULL),
  (13, 4, 6, 80,    NULL, NULL);

-- ---------------------------------------------------------------------
-- Consulta d'exemple: classificació acumulada d'una partida (no es desa).
-- Els jugadors sense cap resposta puntuada surten amb 0.
--
-- SELECT p.nom,
--        COALESCE(SUM(r.punts), 0)                      AS punts,
--        COALESCE(SUM(r.valor = q.resposta_correcta), 0) AS exactes
-- FROM participants p
-- LEFT JOIN respostes r  ON r.participant_id = p.id
-- LEFT JOIN rondes ro    ON ro.id = r.ronda_id
-- LEFT JOIN preguntes q  ON q.id = ro.pregunta_id
-- WHERE p.partida_id = 1
-- GROUP BY p.id, p.nom
-- ORDER BY punts DESC, exactes DESC;
-- ---------------------------------------------------------------------