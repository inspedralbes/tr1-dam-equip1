# 🎯 GUIA DEFINITIVA PER A LA DEFENSA ORAL AMB EL PROFESSOR
## Projecte "How Much?! LIVE" · Mòdul 0486: Accés a Dades (2DAM)
**Objectiu**: Aconseguir la qualificació d'**Excel·lent (100%)** a totes les tasques (T1 a T15).  
*Qualsevol membre de l'equip que llegeixi aquesta guia podrà defensar el projecte amb total seguretat i criteri tècnic com si l'hagués programat ell mateix.*

---

## 🕒 0. ESTRUCTURA I TEMPS DE LA SESSIÓ (25 minuts)

| Bloc | Tasques | Temps | Dinàmica principal |
| :--- | :--- | :--- | :--- |
| **Bloc 1 · Model de dades** | T1, T2, T3 | 4 min | Ensenyar docs, schema.sql i provar CHECK / TRUNCATE |
| **Bloc 2 · Banc de preguntes** | T4, T5, T6 | 5 min | Models Sequelize, CRUD a la web, validacions i esborrat protegit |
| **Bloc 3 · Joc** | T7, T8, T9 | 5 min | Crear partida amb 2 jugadors, jugar 2 rondes i veure rànquing SQL |
| **Bloc 4 · Transaccions** | T10, T11 | 4 min | Tancar ronda (atòmica) i ensenyar `SELECT ... FOR UPDATE` |
| **Bloc 5 · Fitxers** | T12a, T12b, T13 | 4 min | Importar JSON amb errors i exportar CSV a full de càlcul |
| **Bloc 6 · Capa de dades** | T14a, T14b, T15 | 3 min | Cerca de codi (modularitat SQL/Sequelize) i taula de justificació |

> ⚠️ **ATENCIÓ A LA JUGADA**: Els **Blocs 3 i 4 són una sola partida**. Es crea al Bloc 3, s'hi juguen 2 rondes, es tanca al Bloc 4, i aquesta mateixa partida s'exporta al Bloc 5!

---

## 🖥️ CHECKLIST ABANS QUE COMENÇI EL VOSTRE TORN
Tingueu preparat i obert a la pantalla:
1. **MariaDB i el Servidor engegats**:
   - `docker compose up -d` actiu (o el servidor al VPS / local).
2. **phpMyAdmin obert al navegador** (per veure les taules en viu si el professor ho demana).
3. **Tres pestanyes del navegador**:
   - **Pestanya 1**: Panell d'Administració (`http://localhost:5173/admin` o la URL del deploy).
   - **Pestanya 2**: Client Jugador 1 (Anfitrió).
   - **Pestanya 3 (incògnit)**: Client Jugador 2.
4. **L'editor de codi (VS Code / Neovim)** amb el projecte obert i aquestes pestanyes ja a punt:
   - `docs/PERSISTENCIA.md`
   - `backend/docker/db/01-schema.sql`
   - `backend/docker/db/02-dades-inicials.sql`
   - `backend/docker/Servidor/db/models/Pregunta.js`
   - `backend/docker/Servidor/db/jocService.js`
   - `backend/docker/Servidor/db/fitxersService.js`
   - `backend/docker/Servidor/index.js`
5. **El fitxer de preguntes JSON preparat** (`preguntes_sessio.json` a la mà).

---

# 📖 GUIA PAS A PAS PER A CADA TASCA

---

## BLOC 1 · MODEL DE DADES (4 minuts)

### 📌 T1. Diagrama ER i model relacional (RA2 · 8%)
* **Què demana el professor**:
  - Obrir el document de `/docs`.
  - Triarà dues associacions del diagrama i haureu de trobar la seva clau forana (FK) corresponent a `01-schema.sql`.
* **Què heu d'obrir**:
  - Obre el fitxer `docs/PERSISTENCIA.md` (Apartat 1: Diagrama de Classes ER).
* **Com explicar-ho**:
  1. Ensenya el diagrama de classes Mermaid. Explica: *"Tenim 6 entitats clares: `categories`, `preguntes`, `partides`, `participants`, `rondes` i `respostes` amb les seves multiplicitats formals (1..* i 0..*)"*.
  2. Ensenya el Model Relacional just a sota, on es detallen les PK i FK de cada taula.
  3. **Quan el professor us demani trobar 2 associacions a `01-schema.sql`**:
     - *Exemple 1 (Categoria té moltes Preguntes)*: Vés a la línia de la taula `preguntes` i assenyala:
       ```sql
       CONSTRAINT fk_preguntes_categoria FOREIGN KEY (categoria_id) 
           REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
       ```
     - *Exemple 2 (Partida té molts Participants)*: Vés a la línia de la taula `participants` i assenyala:
       ```sql
       CONSTRAINT fk_participants_partida FOREIGN KEY (partida_id) 
           REFERENCES partides(id) ON DELETE CASCADE ON UPDATE CASCADE
       ```
* **Paraules clau per dir**: *"Totes les multiplicitats del diagrama estan reflectides de forma estricta a les claus foranes de SQL amb polítiques d'integritat referencial ON DELETE coherents: RESTRICT per no perdre dades mestres, i CASCADE per netejar fills de partides"*.

---

### 📌 T2. schema.sql (RA2 · 8%)
* **Què demana el professor**:
  - Ensenyar una clau forana amb el seu `ON DELETE`.
  - Ensenyar un `UNIQUE` compost.
  - Ensenyar un `CHECK`.
  - **Inserir a mà una fila que incompleixi el CHECK** (a phpMyAdmin o terminal).
* **Què heu d'obrir**:
  - Fitxer `backend/docker/db/01-schema.sql`.
* **Com explicar-ho**:
  1. **Clau forana amb ON DELETE**:
     - Ensenya `fk_preguntes_categoria`: Té `ON DELETE RESTRICT` (no permet esborrar una categoria si té preguntes).
     - Ensenya `fk_respostes_ronda`: Té `ON DELETE CASCADE` (si s'esborra una ronda, s'esborren les seves respostes).
  2. **UNIQUE compost**:
     - Ensenya a `participants`:
       ```sql
       CONSTRAINT uq_participants_partida_nom UNIQUE (partida_id, nom)
       ```
       *Explicació*: *"Garanteix a nivell de motor que dos jugadors no es puguin dir igual DINS de la mateixa partida, però el mateix nom es pot fer servir en partides diferents"*.
     - O a `respostes`:
       ```sql
       CONSTRAINT uq_respostes_participant_ronda UNIQUE (participant_id, ronda_id)
       ```
       *Explicació*: *"Garanteix per base de dades que un participant només pot tenir una única resposta per ronda"*.
  3. **CHECK constraint**:
     - Ensenya a `preguntes`:
       ```sql
       CONSTRAINT chk_preguntes_min_max CHECK (min_valor IS NULL OR max_valor IS NULL OR min_valor <= max_valor)
       ```
  4. **DEMOSTRACIÓ EN DIRECTE (Inserir fila que falli el CHECK)**:
     - Executa aquesta query a phpMyAdmin o a la consola de MariaDB:
       ```sql
       INSERT INTO preguntes (categoria_id, enunciat, resposta, unitat, min_valor, max_valor)
       VALUES (1, 'Pregunta de prova incorrecta', 50, 'unitats', 100, 20);
       ```
     - **Resultat que sortirà**: `ERROR 4025 (23000): CONSTRAINT `chk_preguntes_min_max` failed for `howmuch`.`preguntes``
     - *Digueu*: *"Com podeu veure, la base de dades rebutja la fila automàticament perquè el valor mínim (100) és més gran que el màxim (20)"*.

---

### 📌 T3. dades-inicials.sql (RA2 · 4%)
* **Què demana el professor**:
  - Executar `dades-inicials.sql` dues vegades seguides i comparar les files i els IDs de dues taules per veure que és idempotent.
* **Què heu d'obrir**:
  - Fitxer `backend/docker/db/02-dades-inicials.sql`.
* **Com explicar-ho**:
  1. Ensenya les primeres línies del fitxer:
     ```sql
     SET FOREIGN_KEY_CHECKS = 0;
     TRUNCATE TABLE respostes;
     TRUNCATE TABLE rondes;
     TRUNCATE TABLE participants;
     TRUNCATE TABLE partides;
     TRUNCATE TABLE preguntes;
     TRUNCATE TABLE categories;
     SET FOREIGN_KEY_CHECKS = 1;
     ```
  2. *Explicació tècnica*: *"Fem servir `TRUNCATE` amb desactivació temporal de Foreign Keys perquè `TRUNCATE` buida les taules i **reinicia els comptadors d'AUTO_INCREMENT a 1**. A continuació inserim les categories i preguntes amb IDs explícits fixos. Per tant, si s'executa 10 cops, mai dona error de clau primària duplicada i els IDs sempre són 100% idèntics"*.
  3. Si el professor ho demana, executeu l'script 2 cops a phpMyAdmin o terminal: veurà que la taula `categories` té exactament les files 1 a 5 i `preguntes` té de la 1 a la 15.

---

## BLOC 2 · BANC DE PREGUNTES AMB SEQUELIZE (5 minuts)

### 📌 T4. Connexió i models sense sync() (RA3 · 5%)
* **Què demana el professor**:
  - El model de preguntes al costat de la taula `01-schema.sql`.
  - Cerca de `sync(` a tot el projecte.
* **Què heu d'obrir**:
  - `backend/docker/Servidor/db/models/Pregunta.js` al costat de `01-schema.sql`.
  - `backend/docker/Servidor/db/sequelize.js`.
* **Com explicar-ho**:
  1. Mostra que les columnes i tipus coincideixen fil per randa:
     - `categoria_id`: `DataTypes.INTEGER`
     - `enunciat`: `DataTypes.TEXT`
     - `resposta`: `DataTypes.DECIMAL(14, 2)`
     - `unitat`: `DataTypes.STRING(50)`
     - `min_valor`, `max_valor`: `DataTypes.DECIMAL(14, 2)`
  2. Mostra les opcions del model:
     ```javascript
     tableName: 'preguntes',
     timestamps: false
     ```
     *Digueu*: *"Tenim `timestamps: false` perquè la taula no té `createdAt` ni `updatedAt` innecessaris, i `tableName: 'preguntes'` per mapejar sobre la taula física existent"*.
  3. **Cerca de sync**: Obre el cercador de l'editor (`Ctrl + Shift + F`) i busca `.sync(`.
     - *Digueu*: *"Veieu que el resultat és 0 ocurrències. La base de dades la crea exclusivament SQL; Sequelize només s'hi connecta com a ORM"*.

---

### 📌 T5. CRUD de categories i preguntes amb validacions al model (RA3 · 8%)
* **Què demana el professor**:
  - Des de la interfície d'administració (Vue), crear, modificar i esborrar categories i preguntes, i comprovar-ho a phpMyAdmin.
  - Intentar desar dades invàlides que ell us indicarà.
  - Ensenyar on són les validacions al model.
* **Què heu de fer (A la pantalla)**:
  1. Obre la pestanya del navegador al Panell d'Administració (`/admin`).
  2. **Pestanya Preguntes**:
     - Prem **`+ Nova Pregunta`**.
     - **Intentar dades invàlides**:
       - Posa l'enunciat buit o a "Resposta" escriu text (ex: `cent`).
       - Prem Desar: la interfície mostrarà l'alerta en vermell: *"Error de validació: La resposta ha de ser numèrica"*.
     - **Crear-ne una de vàlida**:
       - Categoria: `Ciència`, Enunciat: `Quants segons té un minut?`, Resposta: `60`, Unitat: `segons`.
       - Prem Desar: apareixerà a la taula.
     - **Modificar-la**: Clica el llapis d'editar, canvia 60 per 61 i desa.
     - **Esborrar-la**: Clica la icona de la paperera i accepta.
  3. **Ensenyar les validacions al model**:
     - Obre `backend/docker/Servidor/db/models/Pregunta.js`.
     - Ensenya els blocs `validate`:
       ```javascript
       enunciat: { validate: { notEmpty: { msg: "L'enunciat no pot estar buit" } } }
       resposta: { validate: { isNumeric: { msg: "La resposta ha de ser numèrica" } } }
       unitat: { validate: { notEmpty: { msg: "La unitat no pot estar buida" } } }
       ```
     - Obre `Categoria.js`:
       ```javascript
       nom: { unique: true, validate: { notEmpty: { msg: 'El nom no pot estar buit' } } }
       ```

---

### 📌 T6. Associació Categoria-Preguntes amb include i esborrat protegit (RA3 · 7%)
* **Què demana el professor**:
  - Llistat de preguntes d'una categoria (amb el nom de la categoria).
  - L'associació i l'`include` al codi.
  - L'intent d'esborrar una categoria amb preguntes (ha de fallar) i una sense preguntes (ha de funcionar).
* **Què heu de fer (A la pantalla)**:
  1. **L'associació al codi**:
     - Obre `backend/docker/Servidor/db/models/Pregunta.js` (línies finals):
       ```javascript
       Categoria.hasMany(Pregunta, { foreignKey: 'categoria_id', as: 'preguntes' });
       Pregunta.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
       ```
     - *Digueu*: *"L'associació 1:N està declarada en els dos sentits amb la clau forana `categoria_id`"*.
  2. **L'include al codi**:
     - Obre `backend/docker/Servidor/db/preguntesService.js` a la funció `getPreguntes`:
       ```javascript
       return await Pregunta.findAll({
         include: [{ model: Categoria, as: "categoria", attributes: ["id", "nom"] }]
       });
       ```
     - *Digueu*: *"Fem servir l'`include` de Sequelize per portar el nom de la categoria amb un JOIN automàtic"*.
  3. **Esborrat protegit**:
     - Vés a la pestanya de Categories del Panell d'Admin.
     - **Intentar esborrar amb preguntes**: Clica esborrar a la categoria **`Ciència`** (té preguntes).
       - *Resultat*: Surt l'avís vermell: **`No es pot esborrar una categoria que té preguntes associades`**.
     - **Esborrar sense preguntes**:
       - Crea una categoria nova anomenada `TemporalTest`.
       - Clica la paperera de `TemporalTest`: s'esborra sense cap problema.
     - Ensenya el codi a `preguntesService.js` (`deleteCategoria`):
       ```javascript
       const totalPreguntes = await Pregunta.count({ where: { categoria_id: id } });
       if (totalPreguntes > 0) throw new Error("No es pot esborrar una categoria que té preguntes associades");
       ```

---

## BLOCS 3 I 4 · JOC I TRANSACCIONS (9 minuts)
> ⚠️ **Recordeu**: Això és una única partida en viu entre dos jugadors!

---

### 📌 T7. Pool compartit, codi únic i participants (RA2 · 7%)
* **Què demana el professor**:
  - Cerca de `createPool` a tot el projecte.
  - Crear una partida i unir-hi dos clients.
  - Intentar unir un jugador amb un nom repetit.
  - Explicar què passa si el codi generat ja existeix.
* **Com fer-ho**:
  1. **Cerca de `createPool`**:
     - Cerca `createPool` a l'editor: només apareix **un sol cop** a `backend/docker/Servidor/db/mysql.js`.
     - *Digueu*: *"És un singleton exportat per a tot el servidor Node.js, optimitzant connexions"*.
  2. **Crear la partida**:
     - Al Navegador 1: Posa el teu nom (ex: `Marc`), clica **Crear Sala** i anota el codi de 5 xifres generat (ex: `48291`).
     - Al Navegador 2 (incògnit): Posa nom `Laia`, escriu el codi `48291` i clica **Unir-se**. Els dos estan dins de la sala.
  3. **Nom repetit es rebutja**:
     - Obre una tercera pestanya (o finestra privada): Posa de nom `Marc` i intenta entrar a `48291`.
     - *Resultat*: El servidor respon amb codi `NAME_TAKEN` i a la pantalla surt en vermell: **`Aquest nom ja està en ús a la sala`**.
  4. **Què passa si el codi ja existeix?**:
     - Obre `jocService.js` a `crearPartida`:
     - *Digueu*: *"La columna `codi` té una restricció `UNIQUE`. Si el número aleatori de 5 dígits coincidís amb una partida existent, el `INSERT` llençaria un error `ER_DUP_ENTRY` que capturem per reintentar o rebutjar de forma controlada"*.

---

### 📌 T8. Rondes sense preguntes repetides i respostes amb UNIQUE (RA2 · 8%)
* **Què demana el professor**:
  - Jugar dues rondes.
  - Ensenyar la consulta SQL que tria una pregunta no feta en la partida.
  - Fer que un jugador respongui 2 vegades a la mateixa ronda.
* **Com fer-ho**:
  1. **Consulta SQL de no-repetició**:
     - Obre `backend/docker/Servidor/db/jocService.js` a `obtenirPreguntesDisponibles`:
       ```sql
       SELECT p.* FROM preguntes p
       WHERE p.id NOT IN (
           SELECT pregunta_id FROM rondes WHERE partida_id = ?
       )
       ```
     - *Digueu*: *"Aquesta subconsulta a la taula `rondes` garanteix per SQL pur que el servidor mai pugui seleccionar una pregunta que ja s'ha jugat en rondes anteriors d'aquesta partida"*.
  2. **Jugar les dues rondes**:
     - L'anfitrió inicia la partida.
     - Jugador 1 respon (ex: `150`).
     - Jugador 2 respon (ex: `120`).
  3. **Segona resposta rebutjada**:
     - Ensenya a `01-schema.sql` la restricció:
       ```sql
       CONSTRAINT uq_respostes_participant_ronda UNIQUE (participant_id, ronda_id)
       ```
     - Ensenya a `jocService.js` (`respondreRonda`): si s'intenta inserir un segon cop, MariaDB llença `ER_DUP_ENTRY`, que es tradueix com a `ALREADY_ANSWERED` (*"Ja has respost aquesta ronda"*). Si la interfície web bloqueja el botó en enviar, pots ensenyar que a la base de dades és físicament impossible duplicar-ho pel `UNIQUE`.

---

### 📌 T9. Classificació acumulada i final (JOIN, SUM, GROUP BY) (RA2 · 10%)
* **Què demana el professor**:
  - La classificació acumulada després de les 2 rondes.
  - La consulta SQL que la calcula.
  - A phpMyAdmin, la comprovació a mà dels punts d'un jugador.
* **Com fer-ho**:
  1. Ensenya la pantalla de resultats del joc: apareix el rànquing dels jugadors amb els punts acumulats correctes.
  2. **Ensenya la consulta SQL** a `backend/docker/Servidor/db/jocService.js` (`obtenirClassificacio`):
     ```sql
     SELECT 
       p.id AS participant_id,
       p.nom,
       COALESCE(SUM(r.punts), 0) AS punts_totals
     FROM participants p
     LEFT JOIN respostes r ON p.id = r.participant_id
     WHERE p.partida_id = ?
     GROUP BY p.id, p.nom
     ORDER BY punts_totals DESC, p.id ASC;
     ```
  3. **Explicació d'enginyeria**:
     - *"Fem servir `LEFT JOIN` perquè si un jugador s'ha unit però encara no té respostes, no desaparegui de la classificació"*.
     - *"Fem servir `COALESCE(SUM(r.punts), 0)` perquè el valor nul es converteixi en un 0 net"*.
     - *"Fem `GROUP BY p.id, p.nom` per agrupar totes les rondes del jugador i sumar-ne el total"*.
     - *"La classificació **no està guardada en cap taula**; es calcula en temps real per evitar incoherències i redundància de dades"*.
  4. A phpMyAdmin, obre la taula `respostes`: suma els camps `punts` de les dues rondes del Jugador 1 i mostra que coincideix exactament amb la suma calculada.

---

### 📌 T10. Tancar una ronda (punts i estat, amb rollback) (RA2 · 7%)
* **Què demana el professor**:
  - Tancar la segona ronda i comprovar a phpMyAdmin les posicions, els punts i l'estat de la ronda.
  - Ensenyar el codi de la transacció i explicar què passa si una passa falla.
* **Com fer-ho**:
  1. Obre `backend/docker/Servidor/db/jocService.js` a la funció `tancarRonda`:
     ```javascript
     const conn = await pool.getConnection();
     try {
       await conn.beginTransaction();

       // 1. Bloqueig de la ronda
       const [rondes] = await conn.execute(
         'SELECT id, estat FROM rondes WHERE id = ? FOR UPDATE', [rondaId]
       );
       
       // 2. Càlcul de distàncies, assignació de posicions i punts
       for (const res of respostesCalculades) {
         await conn.execute(
           'UPDATE respostes SET posicio = ?, punts = ? WHERE id = ?',
           [res.posicio, res.punts, res.id]
         );
       }

       // 3. Marcar la ronda com a tancada
       await conn.execute("UPDATE rondes SET estat = 'tancada' WHERE id = ?", [rondaId]);

       await conn.commit();
     } catch (err) {
       await conn.rollback();
       throw err;
     } finally {
       conn.release();
     }
     ```
  2. **Explicació d'Excel·lent**:
     - *"Fem servir **una sola connexió del pool** (`pool.getConnection()`) perquè totes les consultes s'executin dins de la mateixa sessió transaccional"*.
     - *"Si el servidor s'apagués o fallés l'UPDATE a mitja llista de respostes, el `conn.rollback()` desfarà tots els canvis. Mai quedarà una ronda tancada amb jugadors sense puntuar, ni jugadors puntuats amb la ronda encara oberta"*.
     - *"El `conn.release()` al bloc `finally` garanteix que la connexió sempre es retorna al pool, evitant fuites de connexions (connection leaks)"*.
  3. A phpMyAdmin, obre la taula `rondes`: mostra que la ronda té `estat = 'tancada'` i a `respostes` cada fila té la seva `posicio` (1, 2) i els seus `punts`.

---

### 📌 T11. Unir-se a partida i respondre amb ronda oberta (FOR UPDATE) (RA2 · 8%)
* **Què demana el professor**:
  - Intentar respondre amb la ronda tancada.
  - Intentar unir un jugador a una partida en curs.
  - Ensenyar el `SELECT ... FOR UPDATE` de les dues transaccions i explicar per què cal.
* **Com fer-ho**:
  1. **Ensenyar les dues consultes amb `FOR UPDATE` a `jocService.js`**:
     - A `unirsePartida`:
       ```sql
       SELECT id, estat FROM partides WHERE id = ? FOR UPDATE;
       ```
       *Per què cal*: *"Si el creador comença la partida just al mateix mil·lisegon que un altre jugador entra, el `FOR UPDATE` bloqueja la fila de la partida. El segon jugador espera que acabi la transacció i, en veure que l'estat ja no és 'esperant', és rebutjat netament amb `GAME_ALREADY_STARTED`"*.
     - A `respondreRonda`:
       ```sql
       SELECT id, estat FROM rondes WHERE id = ? FOR UPDATE;
       ```
       *Per què cal*: *"Impedeix condicions de carrera (race conditions). Si un jugador respon en l'últim mil·lisegon mentre el servidor està tancant la ronda, el bloqueig obliga a esperar. Quan es desbloqueja, comprova `estat === 'tancada'` i llença l'error `ROUND_CLOSED` en lloc de desar una resposta fora de temps"*.

---

## BLOC 5 · FITXERS (4 minuts)

### 📌 T12a i T12b. Validació JSON i desar vàlides amb Sequelize (RA1 i RA3 · 7%)
* **Què demana el professor**:
  - Introduir al JSON els errors que ell us indiqui i importar-lo.
  - Importar un fitxer amb sintaxi trencada.
  - Comprovar que les vàlides s'han desat a MariaDB amb la seva categoria i ensenyar l'informe de descartades.
* **Com fer-ho**:
  1. Vés al Panell d'Administració (`/admin`), pestanya **Fitxers**.
  2. **Demostració de fitxer trencat**:
     - Al quadre de text, enganxa text invàlid (per exemple `[ { "enunciat": "pregunta sense tancar" `).
     - Prem **`Executar Importació JSON`**:
     - *Resultat*: L'aplicació mostra en vermell: **`Format JSON invàlid: Unexpected end of JSON input`**. El servidor NO cau i segueix funcionant al 100%.
  3. **Demostració de validació i informe**:
     - Clica el botó preparat: **`Carregar Exemple JSON de Prova`**.
     - Fixa't en què conté:
       - 2 preguntes vàlides (amb categoria existent com *Ciència* i *Cultura*).
       - 1 pregunta amb resposta de text (`"tres"`).
       - 1 pregunta amb enunciat buit (`""`).
     - Prem **`Executar Importació JSON`**:
     - *Resultat*:
       - Apareix la targeta verda/groga: **`Total: 4 | Importades: 2 | Descartades: 2`**.
       - A la taula inferior surt el desglossament de cada pregunta descartada amb tots els seus motius exactes (`La resposta ha de ser numèrica`, `L'enunciat no pot estar buit`).
  4. **Ensenyar el codi a `backend/docker/Servidor/db/fitxersService.js`**:
     - Ensenya la funció `validarPregunta(pregunta, categoriesMap)`: valida tots els camps alhora i retorna `{ valid, errors, categoria_id }`.
     - Ensenya que només quan `validacio.valid === true` s'executa `Pregunta.create()`.

---

### 📌 T13. Exportació CSV d'una partida acabada (RA1 · 5%)
* **Què demana el professor**:
  - Acabar la partida, exportar-la i obrir el CSV en un full de càlcul (Excel o LibreOffice).
  - Intentar exportar una partida no acabada.
* **Com fer-ho**:
  1. Al Panell d'Admin (pestanya Fitxers), a la secció inferior **`Exportar Partida Acabada a CSV`**, surt el llistat de partides recents.
  2. Clica el botó verd **`CSV`** de la partida que acabeu de jugar: es descarrega automàticament el fitxer `.csv`.
  3. Obre el fitxer descarregat a Excel o LibreOffice Calc.
  4. **Ensenya l'estructura del fitxer**:
     - **Capçalera**: Codi de partida, data i estat.
     - **Secció 1 (Classificació Final)**: Posició, Participant, Punts Totals.
     - **Secció 2 (Detall de Respostes per Ronda)**: Ronda, Enunciat de la pregunta, Resposta Correcta, Unitat, Participant, Valor Estimat, Posició a la Ronda i Punts.
  5. Ensenya el codi a `fitxersService.js`: utilitza la llibreria oficial **`csv-stringify/sync`**, que gestiona automàticament comes, salts de línia, accents i caràcters especials.

---

## BLOC 6 · CAPA DE DADES I JUSTIFICACIÓ (3 minuts)

### 📌 T14a. Mòduls mysql2 reutilitzables (RA2 · 3%)
* **Què demana el professor**:
  - Cerca de `query(` i `execute(` a tot el projecte.
  - Una funció del mòdul que es cridi des de REST i des de WebSockets.
  - On es tradueix `ER_DUP_ENTRY`.
* **Com fer-ho**:
  1. Cerca `execute(` a tot el projecte: mostra que **totes** les crides SQL estan encapsulades a `db/jocService.js`. Ni `index.js` ni `server.js` contenen cap consulta SQL directa.
  2. **Funció cridada des de REST i WebSocket**:
     - Per exemple: `obtenirClassificacio(partidaId)`.
       - Es crida des de REST a `index.js` (`GET /api/partides/:id/classificacio`).
       - Es crida des del WebSocket a `ws/server.js` per emetre els resultats als jugadors.
     - *Digueu*: *"Les funcions no reben mai `req`, `res` ni `socket`; només reben dades primitives i retornen objectes purs, fent-les 100% reutilitzables"*.
  3. **Traducció d'errors**: Ensenya a `jocService.js` com els blocs `catch` capturen `err.code === 'ER_DUP_ENTRY'` i llencen errors d'aplicació nets com `NAME_TAKEN` o `ALREADY_ANSWERED`.

---

### 📌 T14b. Mòduls Sequelize reutilitzables (RA3 · 2%)
* **Què demana el professor**:
  - Cercar `findAll(`, `create(` i `destroy(` a la carpeta del servidor i comprovar que només surten als mòduls de dades.
  - Obrir la funció que converteix els errors de Sequelize en missatges per al client.
  - **Explicar per què `UniqueConstraintError` es comprova abans que `ValidationError`**.
* **Com fer-ho**:
  1. Cerca `findAll(`: només surten a `db/preguntesService.js` i `db/fitxersService.js`.
  2. Obre `backend/docker/Servidor/index.js` (línies 175-195):
     ```javascript
     if (err.name === 'SequelizeUniqueConstraintError' || err.code === 'ER_DUP_ENTRY') {
       return res.status(409).json({ error: 'El registre ja existeix o està duplicat', codi: 'DUPLICATE_ENTRY' });
     }
     if (err.name === 'SequelizeValidationError') {
       const errors = err.errors.map(e => e.message);
       return res.status(400).json({ error: 'Error de validació', detalls: errors });
     }
     if (err.name === 'SequelizeForeignKeyConstraintError') {
       return res.status(400).json({ error: "Restricció d'integritat referencial", codi: 'FK_CONSTRAINT' });
     }
     ```
  3. **RESPOSTA CLAU DE L'ORDRE**:
     - *Digueu*: *"A Sequelize, la classe `UniqueConstraintError` hereta directament de `ValidationError`. Si comprovéssim primer `ValidationError`, els errors de duplicats quedarien absorbits com a simples errors de validació genèrics. Per tant, és obligatori comprovar primer l'error més específic (`UniqueConstraintError`) i després el genèric"*.

---

### 📌 T15. Justificació de quines dades es desen i quines no (RA2 · 3%)
* **Què demana el professor**:
  - Obrir la taula de `/docs` i justificar per què es desen o no algunes dades concretes.
* **Què heu d'obrir**:
  - `docs/PERSISTENCIA.md` (Apartat 2: Justificació de la Persistència).
* **Els 3 Criteris Oficials de la Rúbrica**:
  1. **Que duri**: Dades que han de sobreviure al reinici del servidor (banc de preguntes, categories i historial de partides acabades per exportar).
  2. **Que SQL hi pugui calcular**: Es desen les respostes individuals (`valor_estimat`, `posicio`, `punts`) perquè el motor SQL pugui calcular sumatoris, mitjanes i rànquings amb `GROUP BY`.
  3. **Que una transacció la pugui bloquejar i comprovar**: Els estats de partida (`esperant`) i de ronda (`oberta`) per fer `SELECT ... FOR UPDATE` i garantir concurrència atòmica.
* **QUÈ NO ES DESA I PER QUÈ**:
  - **Les classificacions (ni parcials ni finals)**: *"No es desen a cap taula perquè es calculen dinàmicament per SQL (`SUM(r.punts)`). Si es desessin, hi hauria redundància de dades i risc d'incoherència si es modifiqués una resposta"*.
  - **L'estat en directe i connexions WebSockets**: *"Viu a la memòria RAM de Node.js perquè cap consulta de negoci el necessita i té una durada efímera"*.

---

## ⚡ RESUM RÀPID PER SI ET QUEDES EN BLANC

| Si el professor pregunta... | La teva resposta ha de ser... |
| :--- | :--- |
| **"Per què no feu servir sync() a Sequelize?"** | Perquè l'esquema s'ha de definir exclusivament amb SQL estricte (`01-schema.sql`) amb regles d'integritat, CHECKs i FKs reals que `sync()` no controla bé. |
| **"Per què feu servir FOR UPDATE?"** | Perquè Node.js és asíncron (mono-fil amb concurrència via event loop). Entre un `SELECT` i un `UPDATE` es pot colar una altra petició. El `FOR UPDATE` bloqueja la fila a nivell de base de dades fins al `commit`. |
| **"Per què la classificació no té taula pròpia?"** | Perquè violaria la normalització de bases de dades; és una dada calculable amb `SUM` i `GROUP BY`. Si es desés, tindríem la mateixa dada dos cops. |
| **"Què passa si falla el servidor tancant la ronda?"** | La transacció fa `rollback()` automàtic i la base de dades queda exactament com estava abans d'iniciar el tancament. Mai queda res a mitges. |
| **"Com eviteu preguntes repetides a la partida?"** | Amb la subconsulta SQL: `WHERE p.id NOT IN (SELECT pregunta_id FROM rondes WHERE partida_id = ?)`. |
| **"Com eviteu que algú respongui dos cops?"** | Amb la restricció SQL `UNIQUE(participant_id, ronda_id)`. MariaDB llença `ER_DUP_ENTRY` i el servidor ho rebutja. |

---

## 💻 COMANDES ÚTILS PER TENIR A MÀ

* **Executar tots els tests automàtics al terminal** (26/26 tasques):
  ```bash
  cd /home/unai/tr1-dam-equip1-Desplegament/backend/docker/Servidor
  node test_rubrica.js
  ```
* **Inserir violació de CHECK a mà a MariaDB**:
  ```sql
  INSERT INTO preguntes (categoria_id, enunciat, resposta, unitat, min_valor, max_valor)
  VALUES (1, 'Test Fallada', 50, 'unitats', 200, 10);
  ```
* **Comprovar taules creades**:
  ```sql
  USE howmuch;
  SHOW TABLES;
  ```
