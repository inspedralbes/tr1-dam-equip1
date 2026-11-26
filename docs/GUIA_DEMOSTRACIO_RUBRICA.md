# Guia de Demostració de la Rúbrica: How Much?! LIVE
**Mòdul 0486: Accés a Dades (2DAM)** · Curs 2026-27

Aquesta guia explica exactament com demostrar al professor cadascuna de les 15 tasques de la rúbrica d'avaluació (T1 a T15) per obtenir la màxima puntuació (**Excel·lent**).

---

## 0. Com arrencar Docker a la màquina o VPS sense errors

### Per què va donar error de "taula howmuch no existeix"?
MariaDB executa els scripts de `/docker-entrypoint-initdb.d/` per **ordre alfabètic estricte**. Abans, en dir-se `dades-inicials.sql` i `schema.sql`, s'intentava executar `dades-inicials` abans de crear les taules, MariaDB fallava i abortava la creació de l'esquema.

A més, quan un contenidor MariaDB ja ha creat el volum `db_data`, **no torna a executar els scripts d'inicialització** si el volum ja existeix.

### Com desplegar correctament:
Hem reanomenat els scripts a:
* `backend/docker/db/01-schema.sql` (crea la base de dades i taules amb PK, FK, UNIQUE, CHECK).
* `backend/docker/db/02-dades-inicials.sql` (fa TRUNCATE i carrega les dades conegudes de forma idempotent).

Per reiniciar el contenidor net a la màquina o al VPS (`root@2.31.112.198`):
```bash
cd /home/tr1-dam-equip1-Desplegament/backend/docker   # o la ruta on tinguis el desplegament
docker compose down -v                              # EL -v ESBORRA EL VOLUM ANTIC CORRUPTE!
docker compose up -d --build                        # Aixeca MariaDB, Servidor i Nginx de zero
```
Per comprovar que les taules s'han creat perfectament:
```bash
docker compose exec mariadb sh -c 'mariadb -u "$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" -e "SHOW TABLES;"'
```
Sortiran: `categories`, `partides`, `participants`, `preguntes`, `respostes`, `rondes`.

---

## 1. Demostració Automàtica Instantània

Pots executar en qualsevol moment la suite de proves automatitzada que valida totes les tasques de la rúbrica:
```bash
cd backend/docker/Servidor
node test_rubrica.js
```
Sortirà:
```
====================================================
 RESULTAT FINAL: 26 / 26 TASQUES COMPLERTES (T1 - T15)
====================================================
```

---

## 1.1 Demostració Visual des de la Interfície Web (Vuetify / Electron)

A la pantalla principal de l'aplicació web (`IndexView`), a sota dels botons d'unir-se a sala, hi ha l'accés directe:
👉 **`⚙️ Panell d'Administració`** (ruta `/admin`).

Des d'aquest panell es poden demostrar visualment davant del professor les tasques clau:
1. **Pestanya Preguntes (T5 - CRUD i Validacions)**:
   * Filtre dinàmic per categories.
   * Botó `+ Nova Pregunta`: si s'envia una resposta no numèrica o camps buits, mostra l'error de validació de Sequelize en vermell.
   * Permet editar o esborrar preguntes.
2. **Pestanya Categories (T6 - Esborrat Protegit)**:
   * Llista de categories.
   * Si intentes esborrar una categoria que té preguntes (ex: *Ciència*), salta el bloqueig amb l'alerta: *"No es pot esborrar una categoria que té preguntes associades"*.
3. **Pestanya Fitxers (T12a / T12b - JSON i T13 - CSV)**:
   * **Importar JSON (T12a/T12b)**: Prem *"Carregar Exemple JSON de Prova"* i després *"Executar Importació JSON"*. El servidor importa les vàlides amb Sequelize i mostra la targeta amb el desglossament de preguntes descartades i els motius exactes.
   * **Exportar CSV (T13)**: Mostra el llistat de partides recents i un botó *"CSV"* per descarregar directament el fitxer `.csv` estructurat al navegador.

---

## 2. Demostració Detallada Tasca per Tasca (Per ensenyar al Professor)

### BLOC 1: Model de dades (RA2)

#### T1. Diagrama ER (notació de classe) i model relacional
* **Com es comprova**: Document a `/docs` coherent amb `schema.sql`.
* **On és**: `docs/PERSISTENCIA.md` i `docs/model-dades.md`.
* **Com demostrar-ho**: Obre el fitxer `docs/PERSISTENCIA.md`. Ensenya el diagrama Mermaid de classes on es veuen les entitats, atributs, claus primàries (PK), claus foranes (FK) i la llista del model relacional.

#### T2. schema.sql amb PK, FK, UNIQUE, NOT NULL i CHECK
* **Com es comprova**: S'executa sense errors en una base de dades buida.
* **On és**: `backend/docker/db/01-schema.sql`.
* **Com demostrar-ho**: Ensenya les línies del fitxer SQL:
  * **PK**: `id INT AUTO_INCREMENT PRIMARY KEY` a totes les taules.
  * **FK**: `CONSTRAINT fk_preguntes_categoria ... REFERENCES categories(id) ON DELETE RESTRICT`.
  * **UNIQUE**: `uq_categories_nom`, `uq_partides_codi`, `uq_participants_partida_nom`, `uq_rondes_partida_numero`, `uq_respostes_participant_ronda`.
  * **CHECK**: `CONSTRAINT chk_preguntes_min_max CHECK (min_valor IS NULL OR max_valor IS NULL OR min_valor <= max_valor)`.

#### T3. dades-inicials.sql
* **Com es comprova**: Es pot tornar a executar i sempre deixa el mateix estat.
* **On és**: `backend/docker/db/02-dades-inicials.sql`.
* **Com demostrar-ho**: Ensenya que al principi té:
  ```sql
  SET FOREIGN_KEY_CHECKS = 0;
  TRUNCATE TABLE respostes; ... TRUNCATE TABLE categories;
  SET FOREIGN_KEY_CHECKS = 1;
  ```
  Això garanteix que si s'executa 10 vegades seguides, no dona error de clau duplicada i sempre deixa exactament les mateixes dades inicials.

---

### BLOC 2: Banc de preguntes amb Sequelize (RA3)

#### T4. Connexió i models de categories i preguntes, sense sync()
* **Com es comprova**: Els models corresponen a les taules de l'script.
* **On és**: `db/sequelize.js`, `db/models/Categoria.js`, `db/models/Pregunta.js`.
* **Com demostrar-ho**:
  1. Ensenya `db/sequelize.js`: no hi ha cap crida a `.sync()`.
  2. Ensenya `Categoria.js` i `Pregunta.js`: coincideixen camp per camp amb `01-schema.sql`.

#### T5. CRUD de categories i preguntes amb validacions al model
* **Com es comprova**: Funciona des de l'administració (o API REST); una dada invàlida es rebutja.
* **On és**: `db/preguntesService.js` i `index.js` (rutes `/api/categories` i `/api/preguntes`).
* **Com demostrar-ho**:
  * Envia una petició amb dades invàlides (ex: resposta no numèrica o camp buit):
    ```bash
    curl -X POST http://localhost:8090/api/preguntes -H "Content-Type: application/json" -d '{"enunciat": "", "resposta": "hola"}'
    ```
    El servidor respon amb error 400 de validació de Sequelize.

#### T6. Associació categoria-preguntes amb include i esborrat protegit
* **Com es comprova**: Llistat de preguntes per categoria; no es pot esborrar una categoria amb preguntes.
* **On és**: `db/models/Pregunta.js` (línies d'associació) i `db/preguntesService.js` (`deleteCategoria`).
* **Com demostrar-ho**:
  1. Ensenya `Categoria.hasMany(Pregunta)` i `Pregunta.belongsTo(Categoria)`.
  2. Ensenya a `preguntesService.js`:
     ```javascript
     const total = await Pregunta.count({ where: { categoria_id: id } });
     if (total > 0) throw new Error("No es pot esborrar una categoria que té preguntes");
     ```
  3. Fes un `curl -X DELETE http://localhost:8090/api/categories/1`: es rebutja amb error 400 (`CATEGORY_HAS_QUESTIONS`).

---

### BLOC 3: Joc amb mysql2 (RA2)

#### T7. Pool compartit, partides amb codi únic i participants
* **Com es comprova**: Un sol pool; un codi o un nom repetit es rebutja.
* **On és**: `db/mysql.js`, `db/jocService.js` (`crearPartida`, `unirsePartida`) i `ws/server.js`.
* **Com demostrar-ho**:
  1. `db/mysql.js`: un sol `mysql.createPool` exportat per a tot el projecte.
  2. **Nom repetit es rebutja**: Si un jugador intenta unir-se amb el mateix nom d'un participant que ja és a la sala, tant la comprovació en memòria com la clau SQL `UNIQUE(partida_id, nom)` rebutgen la petició retornant el codi `NAME_TAKEN`. A Vuetify surt el text vermell: *"Aquest nom ja està en ús a la sala"*.

#### T8. Rondes sense preguntes repetides i respostes amb UNIQUE
* **Com es comprova**: Una segona resposta a la mateixa ronda es rebutja.
* **On és**: `db/jocService.js` (`obtenirPreguntesDisponibles`, `respondreRonda`).
* **Com demostrar-ho**:
  1. **Sense repetir**: La consulta SQL té:
     `WHERE p.id NOT IN (SELECT pregunta_id FROM rondes WHERE partida_id = ?)`
  2. **Segona resposta rebutjada**: La taula té `UNIQUE(participant_id, ronda_id)`. Si s'intenta respondre dos cops, `respondreRonda` atrapa `ER_DUP_ENTRY` i llença l'error `ALREADY_ANSWERED` (*"Ja has respost aquesta ronda"*).

#### T9. Classificació acumulada i final (JOIN, SUM, GROUP BY)
* **Com es comprova**: Els resultats coincideixen amb els punts de cada ronda.
* **On és**: `db/jocService.js` (`obtenirClassificacio`).
* **Com demostrar-ho**: Ensenya la consulta SQL pura:
  ```sql
  SELECT p.id AS participant_id, p.nom, COALESCE(SUM(r.punts), 0) AS punts_totals
  FROM participants p
  LEFT JOIN respostes r ON p.id = r.participant_id
  WHERE p.partida_id = ?
  GROUP BY p.id, p.nom
  ORDER BY punts_totals DESC, p.id ASC;
  ```
  La classificació **no està guardada en cap taula** redundant, es calcula dinàmicament per SQL sumant els punts de les respostes de cada jugador.

---

### BLOC 4: Transaccions (RA2)

#### T10. Tancar una ronda (punts i estat, amb rollback)
* **Com es comprova**: Si una passa falla, no queda res a mitges.
* **On és**: `db/jocService.js` (`tancarRonda`).
* **Com demostrar-ho**: Ensenya que comença amb `await conn.beginTransaction()`, actualitza de forma atòmica els punts i posicions de totes les respostes, posa `rondes.estat = 'tancada'` i fa `await conn.commit()`. Si qualsevol `UPDATE` falla, s'executa `await conn.rollback()`.

#### T11. Unir-se a una partida i respondre amb la ronda oberta (FOR UPDATE)
* **Com es comprova**: Una resposta a una ronda tancada es rebutja.
* **On és**: `db/jocService.js` (`unirsePartida` i `respondreRonda`).
* **Com demostrar-ho**: Ensenya el bloqueig de concurrència:
  ```sql
  SELECT id, estat FROM rondes WHERE id = ? FOR UPDATE;
  ```
  Si `estat !== 'oberta'`, fa `conn.rollback()` i llança l'error `ROUND_CLOSED` (*"La ronda està tancada"*). Això impedeix que una resposta enviada en l'últim mil·lisegon s'insereixi quan el servidor ja està calculant resultats.

---

### BLOC 5: Fitxers (RA1)

#### T12a. Llegir i validar el JSON amb validarPregunta() i informe de descartades
* **Com es comprova**: Un JSON amb preguntes invàlides: es detecten totes i s'informa de cada error.
* **On és**: `db/fitxersService.js` (`validarPregunta` i `importarPreguntesJSON`).
* **Com demostrar-ho**: Ensenya com `validarPregunta()` comprova enunciat, valor numèric, unitat, categoria existent i `min <= max`. Retorna `{ valid: false, errors: [...] }` i `importarPreguntesJSON` construeix una llista de `descartades` amb el motiu exacte de cada descart.

#### T12b. Desar les preguntes vàlides amb Sequelize
* **Com es comprova**: Només les vàlides queden a la base de dades, amb la seva categoria.
* **On és**: `db/fitxersService.js` (línia de `Pregunta.create`).
* **Com demostrar-ho**: Ensenya que només les preguntes que passen `validacio.valid === true` s'insereixen mitjançant `Pregunta.create()`.

#### T13. Exportació CSV d'una partida acabada
* **Com es comprova**: El CSV s'obre bé en un full de càlcul.
* **On és**: `db/fitxersService.js` (`exportarPartidaCSV`) i endpoint `GET /api/partides/:id/exportar-csv`.
* **Com demostrar-ho**:
  1. Ensenya que fa servir la llibreria oficial `csv-stringify`.
  2. Genera un CSV estructurat amb dues seccions:
     - Secció 1: **Classificació Final** (Posició, Participant, Punts Totals).
     - Secció 2: **Detall de Respostes per Ronda** (Ronda, Enunciat, Resposta Correcta, Unitat, Participant, Valor Estimat, Posició a la Ronda, Punts).
  3. Fes un `curl http://localhost:8090/api/partides/1/exportar-csv` o descarrega'l des del navegador per obrir-lo a LibreOffice Calc o Excel.

---

### BLOC 6: Capa de dades (RA2 i RA3)

#### T14a. Mòduls mysql2 reutilitzables des de REST i WebSockets; errors per error.code
* **Com es comprova**: No hi ha SQL a les rutes ni als gestors de missatges; `ER_DUP_ENTRY` i similars es tradueixen.
* **On és**: `index.js`, `ws/server.js`, `db/jocService.js`.
* **Com demostrar-ho**: Ni a `index.js` ni a `server.js` hi ha consultes `SELECT` o `INSERT` en brut; criden funcions com `jocService.unirsePartida()`. Els errors com `ER_DUP_ENTRY` es capturen i es converteixen en missatges nets (`NAME_TAKEN`, `ALREADY_ANSWERED`, etc.).

#### T14b. Mòduls Sequelize reutilitzables; errors per tipus
* **Com es comprova**: Les rutes només criden el mòdul; `UniqueConstraintError` i `ValidationError` es tradueixen.
* **On és**: `index.js` (middleware d'errors final):
  ```javascript
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: 'Error de validació', detalls: ... });
  }
  ```

#### T15. Justificació de quines dades es desen i quines no
* **Com es comprova**: Taula a `/docs` amb criteris coherents.
* **On és**: `docs/PERSISTENCIA.md` (Apartat 2).
* **Com demostrar-ho**: Ensenya la taula i explicació segons els 3 criteris:
  1. **Que duri**: preguntes, categories, partides finalitzades.
  2. **Que SQL hi pugui calcular**: punts de respostes per calcular el rànquing; ID de preguntes usades per no repetir-les.
  3. **Que una transacció la pugui bloquejar**: estat de partida i estat de ronda amb `FOR UPDATE`.
  * **No es desen**: Ni els rànquings acumulats (es calculen per SQL) ni els WebSockets/connexions en directe (viuen a la memòria).
