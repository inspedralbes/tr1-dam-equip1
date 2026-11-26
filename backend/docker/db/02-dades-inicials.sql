-- =======================================================
-- HOW MUCH?! LIVE - Dades inicials per a proves (02-dades-inicials.sql)
-- RAD-1 / T3: Estat conegut de proves, reexecutable sense errors
-- =======================================================

USE howmuch;

-- Reexecutable: Neteja previa per deixar sempre el mateix estat conegut
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

-- Banc complet de preguntes
INSERT INTO preguntes (categoria_id, enunciat, resposta, unitat, min_valor, max_valor) VALUES
-- 1. CIENCIA
(1, 'Quants quilòmetres de vasos sanguinis hi ha al cos humà?', 100000.00, 'km', 10000.00, 200000.00),
(1, 'Quantes formigues hi ha al món (en milions de milions)?', 20.00, 'milions de milions', 1.00, 100.00),
(1, 'Quants ossos té el cos humà d''un adult?', 206.00, 'ossos', 50.00, 500.00),
(1, 'Quants dents té un ésser humà adult?', 32.00, 'dents', 10.00, 60.00),
(1, 'A quina temperatura (ºC) es congela l''aigua?', 0.00, 'ºC', -50.00, 50.00),
(1, 'Quants cors té un pop?', 3.00, 'cors', 1.00, 10.00),
(1, 'Quants minuts triga la llum del Sol a arribar a la Terra?', 8.00, 'minuts', 1.00, 30.00),
(1, 'Quantes potes té una aranya?', 8.00, 'potes', 2.00, 20.00),
(1, 'Quants elements químics hi ha confirmats a la taula periòdica?', 118.00, 'elements', 80.00, 160.00),
(1, 'Quants quilòmetres per segon viatja aproximadament la llum en el buit?', 300000.00, 'km/s', 100000.00, 500000.00),
(1, 'Quants dies triga la Lluna a fer una volta sencera al voltant de la Terra?', 27.00, 'dies', 15.00, 45.00),
(1, 'Quants músculs té aproximadament el cos humà?', 650.00, 'músculs', 300.00, 1000.00),
(1, 'A quina temperatura en graus centígrads (ºC) equival el zero absolut?', -273.00, 'ºC', -400.00, -100.00),
(1, 'Quantes vèrtebres cervicals té una girafa (igual que els humans)?', 7.00, 'vèrtebres', 1.00, 25.00),
(1, 'Quants milions d''anys fa que es van extingir els dinosaures?', 66.00, 'milions d''anys', 20.00, 150.00),
(1, 'Quants quilòmetres de distància mitjana hi ha entre la Terra i la Lluna?', 384400.00, 'km', 150000.00, 600000.00),
(1, 'Quants litres de sang bombeja el cor humà aproximadament en un dia?', 7500.00, 'litres', 2000.00, 15000.00),
(1, 'Quants batecs per minut pot fer el cor d''un colibrí en vol?', 1200.00, 'batecs/min', 300.00, 2500.00),

-- 2. GEOGRAFIA
(2, 'Quants quilòmetres mesura aproximadament l''equador terrestre?', 40075.00, 'km', 10000.00, 100000.00),
(2, 'Quants metres d''alçada fa l''Everest?', 8849.00, 'metres', 5000.00, 15000.00),
(2, 'Quants països hi ha actualment al món reconeguts per l''ONU?', 193.00, 'països', 50.00, 350.00),
(2, 'Quants metres de fondària té la fossa de les Marianes a l''oceà Pacífic?', 10994.00, 'metres', 6000.00, 16000.00),
(2, 'Quants quilòmetres de longitud té aproximadament el riu Amazones?', 6992.00, 'km', 4000.00, 10000.00),
(2, 'Quants volcans actius s''estima que hi ha a tot el planeta Terra?', 1500.00, 'volcans', 500.00, 3500.00),
(2, 'Quants milions de quilòmetres quadrats fa la superfície del desert del Sàhara?', 9.00, 'milions km²', 3.00, 20.00),
(2, 'Quants estats formen els Estats Units d''Amèrica?', 50.00, 'estats', 30.00, 80.00),
(2, 'Quantes illes componen aproximadament l''arxipèlag de les Filipines?', 7641.00, 'illes', 2000.00, 15000.00),
(2, 'A quants metres sota el nivell del mar es troba la vora de la mar Morta?', -430.00, 'metres', -700.00, -100.00),
(2, 'Quants quilòmetres mesura la Gran Muralla Xinesa amb totes les ramificacions?', 21196.00, 'km', 5000.00, 35000.00),
(2, 'Quants països del continent africà no tenen sortida directa al mar?', 16.00, 'països', 5.00, 35.00),
(2, 'Quants quilòmetres de frontera comparteixen Espanya i Portugal?', 1214.00, 'km', 500.00, 2200.00),
(2, 'Quants metres d''alçada fa el cim de la Pica d''Estats a Catalunya?', 3143.00, 'metres', 2000.00, 4200.00),

-- 3. CULTURA
(3, 'Quantes finestres té l''Empire State Building?', 6500.00, 'finestres', 1000.00, 15000.00),
(3, 'Quantes tecles té un piano acústic estàndard?', 88.00, 'tecles', 40.00, 120.00),
(3, 'Quants metres d''alçada té la Torre Eiffel de París amb les antenes?', 330.00, 'metres', 150.00, 600.00),
(3, 'Quants pisos té l''edifici més alt del món, el Burj Khalifa?', 163.00, 'pisos', 80.00, 250.00),
(3, 'Quants personatges diferents apareixen a la novel·la Guerra i pau?', 559.00, 'personatges', 150.00, 1200.00),
(3, 'Quants quadres va aconseguir vendre Vincent van Gogh en vida?', 1.00, 'quadre', 0.00, 20.00),
(3, 'Quants premis Oscar va guanyar la pel·lícula El retorn del rei?', 11.00, 'oscars', 3.00, 20.00),
(3, 'Quants anys va dirigir Antoni Gaudí les obres de la Sagrada Família en vida?', 43.00, 'anys', 15.00, 80.00),
(3, 'Quantes peces hi ha sobre un tauler d''escacs en començar la partida?', 32.00, 'peces', 16.00, 64.00),
(3, 'Quants episodis té la sèrie d''animació Els Simpson aproximadament?', 770.00, 'episodis', 400.00, 1200.00),
(3, 'Quants llibres formen la saga original de Harry Potter de J.K. Rowling?', 7.00, 'llibres', 3.00, 15.00),
(3, 'Quants minuts dura el metratge de la pel·lícula Titanic de 1997?', 195.00, 'minuts', 100.00, 300.00),
(3, 'Quants músics toquen habitualment en una orquestra simfònica completa?', 100.00, 'músics', 40.00, 200.00),

-- 4. HISTÒRIA
(4, 'En quin any va caure definitivament l''Imperi Romà d''Occident?', 476.00, 'any', 200.00, 800.00),
(4, 'En quin any va desembarcar Cristòfol Colom per primer cop a Amèrica?', 1492.00, 'any', 1300.00, 1650.00),
(4, 'Quants anys va durar la cèlebre Guerra dels Cent Anys?', 116.00, 'anys', 50.00, 180.00),
(4, 'En quin any es va enfonsar el vaixell Titanic després de xocar amb un iceberg?', 1912.00, 'any', 1850.00, 1950.00),
(4, 'En quin any va caure el Mur de Berlín marcant el final de la Guerra Freda?', 1989.00, 'any', 1960.00, 2010.00),
(4, 'En quin any va xafar l''ésser humà la Lluna per primer cop amb l''Apollo 11?', 1969.00, 'any', 1940.00, 1990.00),
(4, 'Quants dies va durar la Guerra dels Sis Dies el juny de 1967?', 6.00, 'dies', 1.00, 30.00),
(4, 'En quin any va començar la Primera Guerra Mundial?', 1914.00, 'any', 1880.00, 1940.00),
(4, 'Quants anys tenia aproximadament el faraó Tutankamon quan va morir?', 19.00, 'anys', 10.00, 45.00),
(4, 'Quants dies va durar l''aixecament clau de la Revolució d''Octubre de 1917?', 2.00, 'dies', 1.00, 20.00),
(4, 'En quin any es va signar la Declaració d''Independència dels Estats Units?', 1776.00, 'any', 1650.00, 1850.00),
(4, 'Quants anys va durar el regnat històric d''Elisabet II del Regne Unit?', 70.00, 'anys', 30.00, 95.00),
(4, 'En quin any van començar a circular físicament els bitllets i monedes d''euro?', 2002.00, 'any', 1990.00, 2015.00),

-- 5. CURIOSITATS
(5, 'Quants segons té exactament una hora?', 3600.00, 'segons', 1000.00, 10000.00),
(5, 'Quants dies té un any de traspàs?', 366.00, 'dies', 300.00, 400.00),
(5, 'Quants cors té un cuc de terra al llarg del seu cos?', 5.00, 'cors', 1.00, 15.00),
(5, 'Quants ulls té una abella de la mel entre compostos i simples?', 5.00, 'ulls', 2.00, 12.00),
(5, 'Quants bilions d''olors diferents s''estima que pot distingir el nas humà?', 1.00, 'bilió', 0.10, 5.00),
(5, 'Quants quilograms pot arribar a pesar la llengua d''una balena blava adulta?', 2700.00, 'kg', 500.00, 6000.00),
(5, 'Quants quilòmetres de llargària mitjana té el canal d''un llamp atmosfèric?', 8.00, 'km', 2.00, 25.00),
(5, 'Quants bilions de bilions de combinacions possibles té un cub de Rubik 3x3?', 43.00, 'bilions de bilions', 5.00, 150.00),
(5, 'Quants anys pot arribar a viure una tortuga gegant de les illes Galápagos?', 150.00, 'anys', 60.00, 300.00),
(5, 'Quantes vegades bat les ales per segon un mosquit comú en vol?', 600.00, 'vegades/s', 150.00, 1500.00),
(5, 'Quants milions de passos fa de mitjana una persona al llarg de la seva vida?', 150.00, 'milions de passos', 30.00, 400.00),
(5, 'Quants minuts pot aguantar la respiració sota l''aigua una iguana marina?', 45.00, 'minuts', 10.00, 120.00),
(5, 'Quants músculs actua i coordina el cos humà per fer una sola passa?', 200.00, 'músculs', 50.00, 500.00),
(5, 'Quants quilòmetres pot recórrer a la deriva una ampolla al mar en un any?', 6000.00, 'km', 1000.00, 15000.00);
