# Proves del backend (game-service)

Guia pas a pas per comprovar que el servidor de joc funciona: API REST i WebSocket amb diversos jugadors.

- Servei: `backend/game-service`
- Port: `3001`
- REST: `http://localhost:3001/api/...`
- WebSocket: `ws://localhost:3001/ws`

---

## 0. Requisits

- Docker Desktop obert i amb el motor en marxa ("Engine running").
- Un navegador (Chrome, Edge o Firefox) per a les proves de WebSocket.

---

## 1. Aixecar els contenidors

Des de l'arrel del repositori:

```bash
docker compose up -d --build
docker compose ps
```

**Resultat esperat:**

| Contenidor | Estat |
|---|---|
| `howmuch_xampp` | `Up (healthy)` |
| `howmuch_game` | `Up (healthy)` |
| `db-init` | `Exited (0)`: és normal, carrega els SQL i acaba |

Per veure els logs del servidor en directe (deixa aquesta terminal oberta durant les proves):

```bash
docker compose logs -f game-service
```

Cada acció de joc apareix amb el prefix `[game][CODI_SALA]`.

---

## 2. Proves de l'API REST

Obre aquestes URL al navegador o fes-les amb `curl`:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/categories
curl http://localhost:3001/api/rooms
curl http://localhost:3001/api/rooms/XXXXXX
```

| Petició | Codi | Resposta esperada |
|---|---|---|
| `GET /api/health` | 200 | `{"status":"ok","db":"ok"}` |
| `GET /api/categories` | 200 | Les 4 categories del seed (Ciència, Cultura general, Geografia, Història) |
| `GET /api/rooms` | 200 | `[]` si encara no hi ha cap sala |
| `GET /api/rooms/XXXXXX` | 404 | `{"error":{"code":"ROOM_NOT_FOUND",...}}` |
| `GET /api/noexisteix` | 404 | `{"error":{"code":"NOT_FOUND",...}}` |

> Si `/api/health` torna `503` amb `"db":"down"`, Node funciona però no arriba a MariaDB. Vegeu l'apartat 6.

---

## 3. Proves del WebSocket amb dos jugadors

Farem servir la consola del navegador com a client, sense instal·lar res.

1. Obre **dues pestanyes** a `http://localhost:3001/api/health`.
2. A cada pestanya, obre la consola amb **F12 → Console**.

> **Important:** el WebSocket triga uns mil·lisegons a connectar-se. Si fas `send()` abans que s'obri, surt l'error
> `InvalidStateError: Still in CONNECTING state`. Per això el primer missatge s'envia dins de `ws.onopen`.

### Pas 1 · Pestanya 1: l'Anna crea la sala

```js
let ultim;
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (e) => { ultim = JSON.parse(e.data); console.log(ultim.type, ultim.payload); };
ws.onclose = () => console.log('Connexió tancada');
const send = (type, payload) => ws.send(JSON.stringify({ type, payload }));
ws.onopen = () => {
  console.log('Connectat!');
  send('CREATE_ROOM', { name: 'Anna', rounds: 2 });
};
```

**Resultat esperat:**

```
Connectat!
ROOM_JOINED { code: 'KMWLWR', playerId: 1, isHost: true, room: {...} }
```

Copia el valor de `code`. A partir d'aquí el farem servir com a `KMWLWR`; canvia'l pel teu.

### Pas 2 · Pestanya 2: el Biel s'uneix

```js
let ultim;
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (e) => { ultim = JSON.parse(e.data); console.log(ultim.type, ultim.payload); };
ws.onclose = () => console.log('Connexió tancada');
const send = (type, payload) => ws.send(JSON.stringify({ type, payload }));
ws.onopen = () => {
  console.log('Connectat!');
  send('JOIN_ROOM', { code: 'KMWLWR', name: 'Biel' });
};
```

**Resultat esperat:**

- Pestanya 2: `ROOM_JOINED { playerId: 2, isHost: false, ... }`
- Pestanya 1: `PLAYER_JOINED { player: { id: 2, name: 'Biel', isHost: false } }`

> Comprovació extra: `http://localhost:3001/api/rooms/KMWLWR` ha de mostrar els dos jugadors en estat `LOBBY`.

### Pas 3 · Pestanya 1: l'Anna inicia la ronda

```js
send('START_ROUND');
```

**Resultat esperat a les DUES pestanyes:**

```
ROUND_STARTED {
  round: 1, totalRounds: 2,
  question: { id: 12, text: 'Quantes tecles té un piano estàndard?', category: 'Cultura general' },
  slider: { min: 0, max: 180, step: 1 }
}
```

La pregunta i el rang del slider són aleatoris: aquí i al pas 4 es fa servir la del piano (resposta 88) com a exemple.

Comprova que **no hi apareix la resposta correcta**: el servidor no l'envia fins als resultats.

Per veure el rang del slider:

```js
ultim.payload.slider
```

### Pas 4 · Cada jugador vota

Pestanya 1 (Anna). Fes servir un valor entre `slider.min` i `slider.max`:

```js
send('SUBMIT_ANSWER', { value: 80 });
```

**Resultat esperat:**

- Pestanya 1: `ANSWER_ACCEPTED { value: 80 }`
- Les dues: `VOTE_STATUS { answered: [1], total: 2 }`. Diu **qui** ha votat, però no **què**.

Pestanya 2 (Biel):

```js
send('SUBMIT_ANSWER', { value: 90 });
```

**Resultat esperat a les dues pestanyes:** `VOTE_STATUS { answered: [1, 2], total: 2 }` i, tot seguit, la ronda **es tanca automàticament**:

```
ROUND_RESULTS {
  round: 1,
  correctAnswer: 88,
  results: [ { name: 'Biel', value: 90, diff: 2, position: 1, points: 3 },
             { name: 'Anna', value: 80, diff: 8, position: 2, points: 2 } ],
  leaderboard: [ { name: 'Biel', score: 3 }, { name: 'Anna', score: 2 } ],
  isLastRound: false
}
```

Per veure-ho en forma de taula:

```js
console.table(ultim.payload.results);
```

### Pas 5 · Segona ronda i final de partida (pestanya 1)

```js
send('START_ROUND');
```

Torneu a votar tots dos (pas 4). Quan arribi `ROUND_RESULTS` amb `isLastRound: true`:

```js
send('END_GAME');
```

**Resultat esperat a les dues pestanyes:** `GAME_OVER { leaderboard: [...] }` amb la classificació final.

---

## 4. Proves d'errors i validacions

Cal fer-les amb una sala oberta (repeteix els passos 1 i 2 si cal).

| # | On | Codi | Error esperat |
|---|---|---|---|
| 1 | Pestanya 2 (no és amfitrió) | `send('START_ROUND')` | `NOT_HOST` |
| 2 | Qualsevol, sense ronda oberta | `send('SUBMIT_ANSWER', { value: 10 })` | `INVALID_STATE` |
| 3 | Durant una ronda, votar dues vegades | `send('SUBMIT_ANSWER', { value: 10 })` ×2 | `ALREADY_ANSWERED` (la 2a) |
| 4 | Durant una ronda, fora del slider | `send('SUBMIT_ANSWER', { value: 99999999 })` | `INVALID_VALUE` |
| 5 | Durant una ronda, valor no enter | `send('SUBMIT_ANSWER', { value: 'hola' })` | `INVALID_VALUE` |
| 6 | Qualsevol | `ws.send('això no és JSON')` | `BAD_JSON` |
| 7 | Qualsevol | `send('HACK_THE_GAME')` | `UNKNOWN_TYPE` |
| 8 | Pestanya nova, codi inventat | `send('JOIN_ROOM', { code: 'ZZZZZZ', name: 'Pau' })` | `ROOM_NOT_FOUND` |
| 9 | Pestanya nova, nom repetit | `send('JOIN_ROOM', { code: 'KMWLWR', name: 'Anna' })` | `NAME_TAKEN` |
| 10 | Pestanya nova, nom buit | `send('JOIN_ROOM', { code: 'KMWLWR', name: '' })` | `INVALID_NAME` |
| 11 | Pestanya nova, partida ja començada | `send('JOIN_ROOM', { code: 'KMWLWR', name: 'Pau' })` | `GAME_ALREADY_STARTED` |
| 12 | Pestanya 1, rondes acabades | `send('START_ROUND')` després de l'última ronda | `NO_MORE_ROUNDS` |

Les proves 6, 7, 8, 9, 10 i 11 s'han de fer en una pestanya nova, amb el mateix codi del pas 1 però canviant el `send` de dins d'`onopen`.

**Després de cada error, el servidor ha de continuar funcionant**: cap error no tomba el procés.

---

## 5. Proves de desconnexió

### 5.1 Marxa un jugador durant la votació (tancament automàtic)

1. Obre una sala amb Anna i Biel i inicia una ronda.
2. Vota només amb l'Anna.
3. Tanca la pestanya 2 (Biel) o executa-hi `ws.close()`.

**Resultat esperat a la pestanya 1:**

- `PLAYER_LEFT { playerId: 2, newHostId: null }`
- `VOTE_STATUS { answered: [1], total: 1 }`
- `ROUND_RESULTS`: la ronda es tanca sola perquè tots els que queden ja han votat. En Biel hi surt amb `value: null` i 0 punts.

### 5.2 Marxa l'amfitrió (traspàs del rol)

1. Obre una sala nova amb Anna (amfitriona) i Biel.
2. Tanca la pestanya 1 (Anna).

**Resultat esperat a la pestanya 2:** `PLAYER_LEFT { playerId: 1, newHostId: 2 }`. Ara en Biel és l'amfitrió i pot fer `send('START_ROUND')` sense rebre `NOT_HOST`.

### 5.3 Marxen tots

Tanca totes les pestanyes d'una sala. Als logs ha d'aparèixer `[game][KMWLWR] sala eliminada`, i `GET /api/rooms` ja no la mostra.

### 5.4 Aïllament entre sales

1. Crea dues sales diferents (A i B), cadascuna amb el seu jugador.
2. Inicia una ronda a la sala A.

**Resultat esperat:** el jugador de la sala B **no rep cap missatge**.

---

## 6. Problemes habituals

| Símptoma | Causa probable | Solució |
|---|---|---|
| `InvalidStateError: Still in CONNECTING state` | S'ha fet `send()` abans d'obrir la connexió | Envia el primer missatge dins de `ws.onopen` |
| `failed to connect to the docker API` | Docker Desktop no està obert | Obre'l i espera "Engine running" |
| `howmuch_game` no arrenca o es queda a `Created` | Espera que `xampp` estigui *healthy* | `docker compose ps` i `docker compose logs xampp` |
| `/api/health` torna `"db":"down"` | Node no arriba a MariaDB | `docker compose logs db-init`: ha de dir "Base de dades llesta" |
| `port is already allocated` (3306, 8080 o 3001) | Un altre programa o contenidor fa servir el port | Atura'l (`docker stop xampp_container`) o canvia `DB_PORT`, `PMA_PORT` o `GAME_PORT` al `.env` |
| `ws.onopen` no s'executa mai | El servidor no escolta | `docker compose logs game-service`: ha de sortir "escoltant a http://localhost:3001" |
| Els canvis al codi no es veuen | La imatge és antiga | `docker compose up -d --build` |

---

## 7. Resum de missatges

**Client → servidor**

| `type` | `payload` | Qui |
|---|---|---|
| `CREATE_ROOM` | `{ name, rounds? }` | Qualsevol |
| `JOIN_ROOM` | `{ code, name }` | Qualsevol |
| `START_ROUND` | — | Amfitrió |
| `SUBMIT_ANSWER` | `{ value }` (enter dins del slider) | Jugador |
| `CLOSE_ROUND` | — | Amfitrió |
| `END_GAME` | — | Amfitrió |

**Servidor → client**

| `type` | Quan |
|---|---|
| `ROOM_JOINED` | En crear la sala o entrar-hi (només a qui entra) |
| `PLAYER_JOINED` | Entra algú altre a la sala |
| `PLAYER_LEFT` | Marxa algú (inclou `newHostId` si canvia l'amfitrió) |
| `ROUND_STARTED` | Comença una ronda: pregunta i slider, sense la resposta |
| `ANSWER_ACCEPTED` | S'ha acceptat el teu vot |
| `VOTE_STATUS` | Algú vota o marxa: qui ha votat, sense els valors |
| `ROUND_RESULTS` | Es tanca la ronda: resposta correcta, estimacions, punts i classificació |
| `GAME_OVER` | Fi de la partida: classificació final |
| `ERROR` | `{ code, message }` |

> El contracte complet i definitiu ha d'anar a `docs/protocol.md`.
