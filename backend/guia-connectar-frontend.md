# Com connectar el frontend amb el backend

Us explico com fer que el Vue parli amb el servidor. He posat un exemple de codi de cada cosa perquè ho pugueu copiar i després ja ho adapteu.

Ara tot el servidor està en un sol fitxer, server.js, dins de backend/game-service. Fa servir el port 3001 tant per l'API com pel WebSocket.

## Abans de començar

Jo partiria de la branca DesenvolupamentJosep, perquè la pantalla d'inici ja està feta allà. Però aquesta branca no té ni el servidor ni el docker-compose, així que primer us heu de portar dev:

```bash
git fetch
git checkout DesenvolupamentJosep
git merge origin/dev
```

Si de moment no hi ha cap branca de frontend, mireu l'apartat següent.

Després obriu el Docker Desktop i, des de l'arrel del repo, aixequeu els contenidors:

```bash
docker compose up -d --build
docker compose ps
```

Quan acabi, entreu a http://localhost:3001/api/health al navegador. Ha de sortir això:

```json
{"status":"ok","db":"ok"}
```

Si no surt, no té sentit seguir perquè el problema no és del front.

Ara aixequeu el front. El front s'obre a http://localhost:5173:

```bash
cd frontend/HowMuchLive
npm install
npm run dev
```

## Si de moment no hi ha branca de frontend

Es pot començar des de dev. Allà hi ha el projecte de Vue acabat de crear, amb Pinia i Vuetify ja configurats al main.js, però encara sense pantalles ni rutes. Jo ho faria així:

1. Creeu una branca nova per treballar:

```bash
git fetch
git checkout dev
git pull
git checkout -b frontend-connexio
```

2. Creeu el store partida tal com explico a "Com ho he pensat" i els apartats següents. El counter.js només és d'exemple, el podeu esborrar.

3. Creeu la carpeta views amb aquesta vista. No cal que sigui bonica, ja la canviareu:

```vue
<!-- src/views/IndexView.vue -->
<script setup>
import { ref } from 'vue'
import { usePartidaStore } from '@/stores/partida'

const partida = usePartidaStore()
const nom = ref('')
const codi = ref('')
const rondes = ref(5)
</script>

<template>
  <v-container>
    <h2>How Much?! LIVE</h2>
    <v-text-field v-model="nom" label="Nom" />

    <v-text-field v-model="codi" label="Codi de sala" />
    <v-btn @click="partida.unirSala(codi, nom)">Unir-se</v-btn>

    <v-text-field v-model.number="rondes" type="number" label="Rondes" class="mt-6" />
    <v-btn @click="partida.crearSala(nom, rondes)">Crear sala</v-btn>
  </v-container>
</template>
```

4. Copieu la vista de la partida, el router i l'App.vue dels apartats "La vista de la partida" i "Canviar de pantalla".

Si feu això, l'apartat d'enganxar la pantalla d'inici ja el teniu fet. Quan arribi la branca de frontend de veritat, només caldrà portar-hi el store i connectar-hi les seves pantalles.

## Com ho he pensat

El més important és que el WebSocket només estigui en un lloc: un store de Pinia nou. Les vistes no s'han de connectar mai pel seu compte, només llegeixen dades del store i criden les seves funcions.

Creeu el fitxer amb aquesta base. Els trossos dels apartats següents van tots a dins, on posa el comentari:

```js
// src/stores/partida.js
import { ref } from 'vue'
import { defineStore } from 'pinia'

// en local es aixo, quan despleguem s'haura de canviar
const WS_URL = 'ws://localhost:3001/ws'

export const usePartidaStore = defineStore('partida', () => {
  let ws = null

  // aqui dins van els trossos de codi dels apartats seguents
})
```

## Què ha de guardar el store

Tot el que han de pintar les vistes:

```js
  // dins del store: les dades
  const pantalla = ref('inici') // inici, lobby, votacio, resultats o final
  const error = ref('')
  const codi = ref('')
  const meuId = ref(null)
  const socHost = ref(false)
  const jugadors = ref([])
  const ronda = ref(0)
  const totalRondes = ref(0)
  const pregunta = ref(null)
  const slider = ref(null)
  const jaHeVotat = ref(false)
  const vots = ref({ answered: [], total: 0 })
  const resultats = ref(null)
  const classificacio = ref([])
```

## Com es parla amb el servidor

Tots els missatges van en JSON i tenen un tipus i unes dades, per exemple:

```json
{ "type": "CREATE_ROOM", "payload": { "name": "Anna", "rounds": 5 } }
```

Per enviar en fem servir només una funció. Com que la connexió tarda uns mil·lisegons a obrir-se i no es pot enviar res fins que estigui oberta, la primera vegada l'obre i envia el missatge quan està llesta:

```js
  // dins del store: obrir la connexio i enviar
  function enviar(type, payload = {}) {
    const text = JSON.stringify({ type, payload })

    // si ja esta oberta enviem directe
    if (ws && ws.readyState === WebSocket.OPEN) return ws.send(text)
    // si s'esta obrint no fem res, aixi un doble click no crea dues sales
    if (ws && ws.readyState === WebSocket.CONNECTING) return

    // si no, l'obrim i enviem quan estigui llesta
    ws = new WebSocket(WS_URL)
    ws.onopen = () => ws.send(text)
    ws.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data)
        if (missatges[type]) missatges[type](payload)
      } catch (err) {
        console.error('missatge raro del servidor', err)
      }
    }
    ws.onclose = () => {
      netejar()
      error.value = "S'ha tallat la connexió amb el servidor"
    }
  }

  function netejar() {
    ws = null
    pantalla.value = 'inici'
    codi.value = ''
    meuId.value = null
    socHost.value = false
    jugadors.value = []
    ronda.value = 0
    totalRondes.value = 0
    pregunta.value = null
    slider.value = null
    jaHeVotat.value = false
    vots.value = { answered: [], total: 0 }
    resultats.value = null
    classificacio.value = []
  }
```

Quan arriba un missatge, actualitzem les dades. Els que fan canviar de pantalla són ROOM_JOINED, ROUND_STARTED, ROUND_RESULTS i GAME_OVER. Si arriba un ERROR només cal ensenyar el missatge, que ja ve en català:

```js
  // dins del store: que fem amb cada missatge
  const missatges = {
    ROOM_JOINED(p) {
      codi.value = p.code
      meuId.value = p.playerId
      socHost.value = p.isHost
      jugadors.value = p.room.players
      totalRondes.value = p.room.totalRounds
      pantalla.value = 'lobby'
    },
    PLAYER_JOINED(p) {
      jugadors.value.push({ ...p.player, connected: true, score: 0 })
    },
    PLAYER_LEFT(p) {
      if (pantalla.value === 'lobby') {
        jugadors.value = jugadors.value.filter((j) => j.id !== p.playerId)
      } else {
        const qui = jugadors.value.find((j) => j.id === p.playerId)
        if (qui) qui.connected = false
      }
      // si ha marxat l'amfitrio el servidor ens diu qui es el nou
      if (p.newHostId !== null) {
        jugadors.value.forEach((j) => { j.isHost = j.id === p.newHostId })
        socHost.value = p.newHostId === meuId.value
      }
    },
    ROUND_STARTED(p) {
      ronda.value = p.round
      totalRondes.value = p.totalRounds
      pregunta.value = p.question
      slider.value = p.slider
      jaHeVotat.value = false
      vots.value = { answered: [], total: jugadors.value.filter((j) => j.connected).length }
      resultats.value = null
      pantalla.value = 'votacio'
    },
    ANSWER_ACCEPTED() {
      jaHeVotat.value = true
    },
    VOTE_STATUS(p) {
      vots.value = p
    },
    ROUND_RESULTS(p) {
      resultats.value = p
      classificacio.value = p.leaderboard
      pantalla.value = 'resultats'
    },
    GAME_OVER(p) {
      classificacio.value = p.leaderboard
      pantalla.value = 'final'
    },
    ERROR(p) {
      error.value = p.message
    },
  }
```

I per acabar el store, les funcions que criden les vistes. El return ha d'anar l'últim:

```js
  // dins del store: les funcions que fan servir les vistes
  const crearSala = (nom, rondes) => enviar('CREATE_ROOM', { name: nom, rounds: rondes })
  const unirSala = (codiSala, nom) => enviar('JOIN_ROOM', { code: codiSala, name: nom })
  const iniciarRonda = () => enviar('START_ROUND')
  const respondre = (valor) => enviar('SUBMIT_ANSWER', { value: valor })
  const tancarRonda = () => enviar('CLOSE_ROUND')
  const acabarPartida = () => enviar('END_GAME')

  // no hi ha missatge per sortir, es tanca la connexio i ja
  function sortir() {
    if (ws) {
      ws.onclose = null
      ws.close()
    }
    netejar()
  }

  return {
    pantalla, error, codi, meuId, socHost, jugadors, ronda, totalRondes,
    pregunta, slider, jaHeVotat, vots, resultats, classificacio,
    crearSala, unirSala, iniciarRonda, respondre, tancarRonda, acabarPartida, sortir,
  }
```

## Enganxar-ho a la pantalla d'inici

A IndexView, a la branca DesenvolupamentJosep, hi ha dos console.log esperant això. Primer importeu el store. L'import va amb els altres i la constant sota la del player:

```js
import { usePartidaStore } from '@/stores/partida'

const partida = usePartidaStore()
```

A la funció unirse(), canvieu el console.log per:

```js
partida.unirSala(codi, player.nom)
```

A la funció crearSala(), canvieu el console.log per:

```js
partida.crearSala(player.nom, configSala.rondes)
```

Al popup de crear sala hi ha visibilitat i màxim de jugadors, però ara mateix el servidor no en fa res. Només fa servir les rondes.

## Canviar de pantalla

Qui mana és el servidor. Quan arriba un missatge canvia la pantalla del store, i l'App.vue ho vigila i canvia de ruta. Els botons no han de canviar de pantalla pel seu compte.

Al router hem de fer servir el mode hash, perquè amb Electron l'altre no funciona. Si veniu de la branca DesenvolupamentJosep, així ja desapareix la ruta about, que apuntava a un fitxer que no existeix:

```js
// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import IndexView from '@/views/IndexView.vue'
import PartidaView from '@/views/PartidaView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: IndexView },
    { path: '/partida', name: 'partida', component: PartidaView },
  ],
})

export default router
```

A l'App.vue hi va el watch que canvia de ruta i un missatge per ensenyar els errors. El v-app i el RouterView són obligatoris, si no, les vistes no es veuen:

```vue
<!-- src/App.vue -->
<script setup>
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { usePartidaStore } from '@/stores/partida'

const partida = usePartidaStore()
const router = useRouter()

watch(
  () => partida.pantalla,
  (p) => router.push(p === 'inici' ? '/' : '/partida'),
  { immediate: true }
)
</script>

<template>
  <v-app>
    <v-main>
      <RouterView />
    </v-main>
    <v-snackbar
      :model-value="partida.error !== ''"
      color="red"
      @update:model-value="partida.error = ''"
    >
      {{ partida.error }}
    </v-snackbar>
  </v-app>
</template>
```

## La vista de la partida

Per començar ho he posat tot a la mateixa vista, i només es veu la part que toca segons la pantalla del store. Quan funcioni ja ho separareu en vistes i ho fareu bonic:

```vue
<!-- src/views/PartidaView.vue -->
<script setup>
import { ref, watch } from 'vue'
import { usePartidaStore } from '@/stores/partida'

const partida = usePartidaStore()
const valor = ref(0)

// quan arriba una ronda nova posem el slider al mig
watch(() => partida.slider, (s) => {
  if (s) valor.value = Math.round((s.min + s.max) / 2)
})
</script>

<template>
  <v-container>
    <!-- sala d'espera -->
    <div v-if="partida.pantalla === 'lobby'">
      <h2>Sala {{ partida.codi }}</h2>
      <v-list>
        <v-list-item v-for="j in partida.jugadors" :key="j.id">
          {{ j.name }} <span v-if="j.isHost">(amfitrió)</span>
        </v-list-item>
      </v-list>
      <v-btn v-if="partida.socHost" @click="partida.iniciarRonda()">Començar</v-btn>
    </div>

    <!-- votacio -->
    <div v-if="partida.pantalla === 'votacio'">
      <p>Ronda {{ partida.ronda }} de {{ partida.totalRondes }} · {{ partida.pregunta.category }}</p>
      <h2>{{ partida.pregunta.text }}</h2>
      <v-slider
        v-model="valor"
        :min="partida.slider.min"
        :max="partida.slider.max"
        :step="partida.slider.step"
        :disabled="partida.jaHeVotat"
        thumb-label="always"
        class="mt-10"
      />
      <v-btn :disabled="partida.jaHeVotat" @click="partida.respondre(valor)">Enviar</v-btn>
      <p class="mt-4">Han votat {{ partida.vots.answered.length }} de {{ partida.vots.total }}</p>
      <v-btn v-if="partida.socHost" @click="partida.tancarRonda()">Tancar ronda</v-btn>
    </div>

    <!-- resultats -->
    <div v-if="partida.pantalla === 'resultats'">
      <h2>La resposta era {{ partida.resultats.correctAnswer }}</h2>
      <v-list>
        <v-list-item v-for="r in partida.resultats.results" :key="r.playerId">
          {{ r.name }}: {{ r.value ?? 'no ha respost' }} (+{{ r.points }})
        </v-list-item>
      </v-list>
      <div v-if="partida.socHost">
        <v-btn v-if="partida.resultats.isLastRound" @click="partida.acabarPartida()">Acabar</v-btn>
        <v-btn v-else @click="partida.iniciarRonda()">Següent ronda</v-btn>
      </div>
    </div>

    <!-- final -->
    <div v-if="partida.pantalla === 'final'">
      <h2>Classificació final</h2>
      <v-list>
        <v-list-item v-for="(j, i) in partida.classificacio" :key="j.playerId">
          {{ i + 1 }}. {{ j.name }}: {{ j.score }} punts
        </v-list-item>
      </v-list>
      <v-btn @click="partida.sortir()">Tornar a l'inici</v-btn>
    </div>
  </v-container>
</template>
```

Sobre la votació, fixeu-vos en tres coses del codi d'aquí dalt:

- El mínim i el màxim del slider els envia el servidor a cada ronda. La resposta ha de ser un número enter dins d'aquest rang.
- Un cop heu votat, el slider queda bloquejat amb jaHeVotat perquè només es pot votar una vegada.
- Els botons de començar, tancar ronda i acabar només es veuen amb socHost. Si l'amfitrió marxa, el servidor avisa de qui és el nou i el store ho actualitza sol.

## Per provar-ho

Cada pestanya del navegador és un jugador diferent. Amb una creeu la sala, amb l'altra us hi uniu amb el codi, i a la primera ha d'aparèixer el jugador nou sense recarregar. Després comenceu la ronda i voteu tots dos. Quan vota l'últim, els resultats surten sols.

Si voleu veure tot el que arriba del servidor, afegiu aquesta línia a dins de l'onmessage del store, i ho veureu a la consola (F12):

```js
console.log('arriba:', e.data)
```

## Coses a tenir en compte

- No hi ha reconnexió. Si es talla la connexió o recarregueu la pàgina a mitja partida, ja no podeu tornar a entrar.
- Només es pot entrar a una sala mentre està a la sala d'espera.
- Quan s'acaba l'última ronda la partida no es tanca sola, l'amfitrió ha de prémer acabar.
- No hi ha cap missatge per sortir de la sala, simplement es tanca la connexió. Per fer un botó de sortir:

```vue
<v-btn @click="partida.sortir()">Sortir</v-btn>
```

- Quan ho despleguem haurem de canviar l'adreça, perquè localhost no servirà a l'executable. Ho podem treure d'una variable a dalt del store:

```js
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'
```

I crear un fitxer frontend/HowMuchLive/.env.production amb l'adreça bona, que encara no la tenim perquè falta el Nginx:

```bash
VITE_WS_URL=wss://la-nostra-adreca/ws
```

Si us encalleu, digueu-m'ho i us passo la llista completa de missatges.
