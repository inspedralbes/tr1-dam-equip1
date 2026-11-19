-- =====================================================================
-- HOW MUCH?! LIVE · Dades inicials (estat conegut per fer proves)
--
-- 1) 8 categories (les mateixes que es voten al joc) amb 10 preguntes cadascuna
-- 2) 4 usuaris
-- 3) 3 partides d'exemple, una per estat:
--      10001  acabada   3 rondes jugades i puntuades (Josep 8, Unai 7, Pol 6)
--      10002  en_curs   ronda 1 oberta (posicio i punts encara NULL)
--      10003  esperant  només sala d'espera, sense rondes
--
-- Fitxer en UTF-8 (accents). Les cometes simples dins del text van doblades ('').
-- =====================================================================

SET NAMES utf8mb4;
USE howmuch_live;

-- ---------------------------------------------------------------------
-- 1) Categories i preguntes
-- ---------------------------------------------------------------------
INSERT INTO categories (id, nom) VALUES
  (1, 'Ciència i Natura'),
  (2, 'Història'),
  (3, 'Geografia'),
  (4, 'Esports'),
  (5, 'Cinema i Sèries'),
  (6, 'Música'),
  (7, 'Art i Literatura'),
  (8, 'Tecnologia');

INSERT INTO preguntes (id, categoria_id, enunciat, resposta_correcta, unitat) VALUES
  -- Ciència i Natura
  (1,  1, 'Quants quilòmetres de vasos sanguinis hi ha al cos humà?', 100000, 'km'),
  (2,  1, 'Quants ossos té el cos humà d''un adult?', 206, 'ossos'),
  (3,  1, 'Quantes dents té un ésser humà adult?', 32, 'dents'),
  (4,  1, 'Quants cors té un pop?', 3, 'cors'),
  (5,  1, 'Quantes potes té una aranya?', 8, 'potes'),
  (6,  1, 'Quants minuts triga la llum del Sol a arribar a la Terra?', 8, 'minuts'),
  (7,  1, 'A quina temperatura es congela l''aigua?', 0, 'ºC'),
  (8,  1, 'Quants elements té la taula periòdica?', 118, 'elements'),
  (9,  1, 'Quantes formigues hi ha al món (en milions de milions)?', 20, 'milions de milions'),
  (10, 1, 'Quants cromosomes té una cèl·lula humana?', 46, 'cromosomes'),
  -- Història
  (11, 2, 'En quin any va arribar Colom a Amèrica?', 1492, 'any'),
  (12, 2, 'En quin any va caure el mur de Berlín?', 1989, 'any'),
  (13, 2, 'En quin any va començar la Revolució Francesa?', 1789, 'any'),
  (14, 2, 'En quin any va arribar l''ésser humà a la Lluna?', 1969, 'any'),
  (15, 2, 'Quants anys va durar la Guerra dels Cent Anys?', 116, 'anys'),
  (16, 2, 'En quin any va acabar la Segona Guerra Mundial?', 1945, 'any'),
  (17, 2, 'En quin any van començar les obres de la Sagrada Família?', 1882, 'any'),
  (18, 2, 'En quin any abans de Crist va morir Juli Cèsar?', 44, 'any aC'),
  (19, 2, 'En quin any va començar la Primera Guerra Mundial?', 1914, 'any'),
  (20, 2, 'Quants anys va regnar Isabel II del Regne Unit?', 70, 'anys'),
  -- Geografia
  (21, 3, 'Quants quilòmetres mesura aproximadament l''equador terrestre?', 40075, 'km'),
  (22, 3, 'Quants metres d''alçada fa l''Everest?', 8849, 'metres'),
  (23, 3, 'Quants països reconeix actualment l''ONU com a estats membres?', 193, 'països'),
  (24, 3, 'Quants quilòmetres fa aproximadament el riu Nil?', 6650, 'km'),
  (25, 3, 'Quantes comarques té Catalunya?', 43, 'comarques'),
  (26, 3, 'Quants metres d''alçada fa la Pica d''Estats?', 3143, 'metres'),
  (27, 3, 'Quants milions d''habitants té aproximadament el Japó?', 124, 'milions'),
  (28, 3, 'Quants estats formen els Estats Units?', 50, 'estats'),
  (29, 3, 'Quants quilòmetres quadrats fa Andorra?', 468, 'km²'),
  (30, 3, 'Quants oceans hi ha a la Terra?', 5, 'oceans'),
  -- Esports
  (31, 4, 'En quin any es van celebrar els Jocs Olímpics de Barcelona?', 1992, 'any'),
  (32, 4, 'Quants jugadors té un equip de futbol al camp?', 11, 'jugadors'),
  (33, 4, 'Quants metres fa una marató?', 42195, 'metres'),
  (34, 4, 'Quants minuts dura un partit de l''NBA (temps reglamentari)?', 48, 'minuts'),
  (35, 4, 'Quantes Copes del Món de futbol ha guanyat el Brasil?', 5, 'copes'),
  (36, 4, 'Quants punts val un touchdown al futbol americà?', 6, 'punts'),
  (37, 4, 'Quants forats té un recorregut de golf estàndard?', 18, 'forats'),
  (38, 4, 'Quants metres de llarg fa una piscina olímpica?', 50, 'metres'),
  (39, 4, 'Quants anells té el símbol olímpic?', 5, 'anells'),
  (40, 4, 'Quants torneigs de Grand Slam de tennis es juguen cada any?', 4, 'torneigs'),
  -- Cinema i Sèries
  (41, 5, 'Quants Oscars va guanyar Titanic?', 11, 'Oscars'),
  (42, 5, 'En quin any es va estrenar la primera pel·lícula de Star Wars?', 1977, 'any'),
  (43, 5, 'Quantes temporades té Joc de Trons?', 8, 'temporades'),
  (44, 5, 'Quantes pel·lícules té la saga de Harry Potter?', 8, 'pel·lícules'),
  (45, 5, 'Quantes temporades té Friends?', 10, 'temporades'),
  (46, 5, 'En quin any es va estrenar Toy Story?', 1995, 'any'),
  (47, 5, 'Quants minuts dura aproximadament Titanic?', 195, 'minuts'),
  (48, 5, 'Quants nans hi ha a la Blancaneu?', 7, 'nans'),
  (49, 5, 'En quin any es va estrenar Breaking Bad?', 2008, 'any'),
  (50, 5, 'En quin any es va estrenar la pel·lícula d''animació El Rei Lleó?', 1994, 'any'),
  -- Música
  (51, 6, 'Quantes tecles té un piano estàndard?', 88, 'tecles'),
  (52, 6, 'Quantes cordes té una guitarra espanyola?', 6, 'cordes'),
  (53, 6, 'Quants membres tenien els Beatles?', 4, 'membres'),
  (54, 6, 'Quantes simfonies va compondre Beethoven?', 9, 'simfonies'),
  (55, 6, 'En quin any va morir Michael Jackson?', 2009, 'any'),
  (56, 6, 'Quantes notes té l''escala musical (do, re, mi...)?', 7, 'notes'),
  (57, 6, 'En quin any es va celebrar el primer Festival d''Eurovisió?', 1956, 'any'),
  (58, 6, 'Quantes cordes té un violí?', 4, 'cordes'),
  (59, 6, 'Quants anys tenia Mozart quan va morir?', 35, 'anys'),
  (60, 6, 'En quin any va néixer Rosalía?', 1992, 'any'),
  -- Art i Literatura
  (61, 7, 'En quin any es va publicar la primera part del Quixot?', 1605, 'any'),
  (62, 7, 'En quin any va néixer Picasso?', 1881, 'any'),
  (63, 7, 'En quin any va pintar Picasso el Guernica?', 1937, 'any'),
  (64, 7, 'Quants llibres té la saga de Harry Potter?', 7, 'llibres'),
  (65, 7, 'En quin any va morir Gaudí?', 1926, 'any'),
  (66, 7, 'En quin any va néixer Mercè Rodoreda?', 1908, 'any'),
  (67, 7, 'Quantes torres tindrà la Sagrada Família quan estigui acabada?', 18, 'torres'),
  (68, 7, 'En quin any aproximadament va començar Leonardo da Vinci la Gioconda?', 1503, 'any'),
  (69, 7, 'En quin any es va publicar Tirant lo Blanc?', 1490, 'any'),
  (70, 7, 'En quin any va morir Cervantes?', 1616, 'any'),
  -- Tecnologia
  (71, 8, 'En quin any es va presentar el primer iPhone?', 2007, 'any'),
  (72, 8, 'Quants bits té un byte?', 8, 'bits'),
  (73, 8, 'En quin any es va fundar Google?', 1998, 'any'),
  (74, 8, 'En quin any es va proposar la World Wide Web?', 1989, 'any'),
  (75, 8, 'Quants megabytes té un gigabyte (en binari)?', 1024, 'MB'),
  (76, 8, 'En quin any es va fundar Microsoft?', 1975, 'any'),
  (77, 8, 'En quin any es va publicar la primera versió de Linux?', 1991, 'any'),
  (78, 8, 'En quin any va sortir la primera PlayStation al Japó?', 1994, 'any'),
  (79, 8, 'Quants caràcters tenia com a màxim un tuit original?', 140, 'caràcters'),
  (80, 8, 'En quin any va aparèixer JavaScript?', 1995, 'any');

-- ---------------------------------------------------------------------
-- 2) Usuaris
-- ---------------------------------------------------------------------
INSERT INTO usuaris (id, nom, creat_el, ultima_partida_el) VALUES
  (1, 'Pol',   '2026-11-10 10:00:00', '2026-11-12 10:00:00'),
  (2, 'Josep', '2026-11-10 10:01:00', '2026-11-10 10:05:00'),
  (3, 'Unai',  '2026-11-10 10:02:00', '2026-11-12 11:00:00'),
  (4, 'Marta', '2026-11-12 09:59:00', '2026-11-12 10:00:00');

-- ---------------------------------------------------------------------
-- 3) Partides d'exemple
-- ---------------------------------------------------------------------
INSERT INTO partides (id, codi, estat, num_rondes, max_jugadors, creada_el, iniciada_el, acabada_el) VALUES
  (1, '10001', 'acabada',  3, 6, '2026-11-10 10:05:00', '2026-11-10 10:07:00', '2026-11-10 10:15:00'),
  (2, '10002', 'en_curs',  5, 4, '2026-11-12 10:00:00', '2026-11-12 10:02:00', NULL),
  (3, '10003', 'esperant', 5, 10, '2026-11-12 11:00:00', NULL, NULL);

INSERT INTO participants (id, partida_id, usuari_id, nom, es_amfitrio) VALUES
  (1, 1, 1, 'Pol',   TRUE),
  (2, 1, 2, 'Josep', FALSE),
  (3, 1, 3, 'Unai',  FALSE),
  (4, 2, 4, 'Marta', TRUE),
  (5, 2, 1, 'Pol',   FALSE),
  (6, 3, 3, 'Unai',  TRUE);

-- Partida 10001: 3 preguntes de Geografia, totes tancades
-- Partida 10002: 1a ronda oberta
INSERT INTO rondes (id, partida_id, numero, pregunta_id, estat, oberta_el) VALUES
  (1, 1, 1, 21, 'tancada', '2026-11-10 10:08:00.000'),
  (2, 1, 2, 22, 'tancada', '2026-11-10 10:10:00.000'),
  (3, 1, 3, 23, 'tancada', '2026-11-10 10:12:00.000'),
  (4, 2, 1, 1,  'oberta',  '2026-11-12 10:03:00.000');

-- Punts: 1r 3, 2n 2, 3r 1 i +2 si és exacta. Empat → guanya qui respon abans.
INSERT INTO respostes (id, ronda_id, participant_id, valor, respost_el, posicio, punts) VALUES
  -- Ronda 1 (correcta 40075): Unai exacte 5, Pol 2, Josep 1
  (1, 1, 1, 40000, '2026-11-10 10:08:05.120', 2, 2),
  (2, 1, 2, 45000, '2026-11-10 10:08:07.450', 3, 1),
  (3, 1, 3, 40075, '2026-11-10 10:08:09.010', 1, 5),
  -- Ronda 2 (correcta 8849): Josep exacte 5, Unai 2, Pol 1
  (4, 2, 1, 8000,  '2026-11-10 10:10:04.300', 3, 1),
  (5, 2, 2, 8849,  '2026-11-10 10:10:06.800', 1, 5),
  (6, 2, 3, 9000,  '2026-11-10 10:10:08.200', 2, 2),
  -- Ronda 3 (correcta 193): Pol 3, Josep 2, Unai no respon (sense fila)
  (7, 3, 1, 190,   '2026-11-10 10:12:03.000', 1, 3),
  (8, 3, 2, 200,   '2026-11-10 10:12:05.500', 2, 2),
  -- Partida 10002, ronda oberta: encara sense posició ni punts
  (9, 4, 4, 120000, '2026-11-12 10:03:10.000', NULL, NULL);
