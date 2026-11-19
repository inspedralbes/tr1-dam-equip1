-- =======================================================
-- HOW MUCH?! LIVE - Dades inicials per a proves (02-dades-inicials.sql)
-- RAD-1 / T3: Estat conegut de proves, reexecutable sense errors
-- =======================================================

USE howmuch;

-- Reexecutable: Neteja prèvia per deixar sempre el mateix estat conegut
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE respostes;
TRUNCATE TABLE rondes;
TRUNCATE TABLE participants;
TRUNCATE TABLE partides;
TRUNCATE TABLE preguntes;
TRUNCATE TABLE categories;
SET FOREIGN_KEY_CHECKS = 1;

-- Categories inicials
INSERT INTO categories (id, nom) VALUES
(1, 'Ciència'),
(2, 'Geografia'),
(3, 'Cultura'),
(4, 'Història'),
(5, 'Curiositats');

-- Preguntes inicials
INSERT INTO preguntes (categoria_id, enunciat, resposta, unitat, min_valor, max_valor) VALUES
(1, 'Quants quilòmetres de vasos sanguinis hi ha al cos humà?', 100000.00, 'km', 10000.00, 200000.00),
(1, 'Quantes formigues hi ha al món (en milions de milions)?', 20.00, 'milions de milions', 1.00, 100.00),
(3, 'Quantes finestres té l''Empire State Building?', 6500.00, 'finestres', 1000.00, 15000.00),
(2, 'Quants quilòmetres mesura aproximadament l''equador terrestre?', 40075.00, 'km', 10000.00, 100000.00),
(2, 'Quants metres d''alçada fa l''Everest?', 8849.00, 'metres', 5000.00, 15000.00),
(1, 'Quants ossos té el cos humà d''un adult?', 206.00, 'ossos', 50.00, 500.00),
(2, 'Quants països hi ha actualment al món reconeguts per l''ONU?', 193.00, 'països', 50.00, 350.00),
(1, 'Quants dents té un ésser humà adult?', 32.00, 'dents', 10.00, 60.00),
(1, 'A quina temperatura (ºC) es congela l''aigua?', 0.00, 'ºC', -50.00, 50.00),
(1, 'Quants cors té un pop?', 3.00, 'cors', 1.00, 10.00),
(5, 'Quants segons té una hora?', 3600.00, 'segons', 1000.00, 10000.00),
(3, 'Quantes tecles té un piano estàndard?', 88.00, 'tecles', 40.00, 120.00),
(1, 'Quants minuts triga la llum del Sol a arribar a la Terra?', 8.00, 'minuts', 1.00, 30.00),
(1, 'Quantes potes té una aranya?', 8.00, 'potes', 2.00, 20.00),
(5, 'Quants dies té un any de traspàs?', 366.00, 'dies', 300.00, 400.00);
