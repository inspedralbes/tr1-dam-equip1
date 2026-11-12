<script setup>
import { ref, reactive, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { usePlayerStore } from '@/stores/player'

import { useRouter } from 'vue-router'

const router = useRouter()

//Constants de la sala
import { useRoomStore, CONFIG_PER_DEFECTE } from '@/stores/room'
const room = useRoomStore()
const connexio = useConnectionStore()

const player = usePlayerStore()

//Codi per gestionar nom jugador
const nomInput = ref('')
const error = ref('')

function registrar() {
  const ok = player.registrarNom(nomInput.value)
  error.value = ok ? '' : 'El nom no pot estar buit'
}

//Codi gestionar codi sala
const codiSala = ref('')
const errorUnir = ref('')

let ultimaAccio = ''

async function unirse() {
  if (!player.estaRegistrat) {
    errorUnir.value = 'Primer has de registrar el teu nom'
    return
  }

  const codi = codiSala.value.trim()
  if (codi === '') {
    errorUnir.value = 'Introdueix un codi de sala'
    return
  }
  if (!/^\d{4}$/.test(codi)) {
    errorUnir.value = 'El codi ha de tenir 4 xifres'
    return
  }

  errorUnir.value = ''
  ultimaAccio = 'unir'

  try {
    await connexio.connectar()
    connexio.enviar({ type: 'joinRoom', roomId: Number(codi), name: player.nom })
  } catch (e) {
    errorUnir.value = 'No s\'ha pogut connectar amb el servidor'
  }
}

//Codi per gestionar crear sala
const dialogCrear = ref(false)
const errorCrear = ref('')

function obrirCrearSala() {
  if (!player.estaRegistrat) {
    errorCrear.value = 'Primer has de registrar el teu nom'
    return
  }
  errorCrear.value = ''
  Object.assign(configSala, CONFIG_PER_DEFECTE)
  dialogCrear.value = true
}


const configSala = reactive({
  ...CONFIG_PER_DEFECTE
})


//Gestió del popup de crear sala
const opcionsJugadors = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const opcionsRondes = [5, 6, 7, 8, 9, 10]

async function crearSala() {
  errorCrear.value = ''
  ultimaAccio = 'crear'
  dialogCrear.value = false

  try {
    await connexio.connectar()
    connexio.enviar({
      type: 'createRoom',
      name: player.nom,
      config: { ...configSala }
    })
    router.push({ name: 'sala-espera' })
  } catch (e) {
    errorCrear.value = 'No s\'ha pogut connectar amb el servidor'
    console.log(e.message) 
  }
}

const MISSATGES_ERROR = {
  NAME_TAKEN: 'Aquest nom ja està en ús a la sala',
  ROOM_FULL: 'La sala està plena',
  ROOM_NOT_FOUND: 'No existeix cap sala amb aquest codi',
  INVALID_STATE: 'La partida ja ha començat'
}

watch(() => room.codi, (nou) => {
  if (nou !== '') {
    router.push({ name: 'sala-espera' })
  }
})

watch(() => connexio.errorServidor, (error) => {
  if (!error) return

  const text = MISSATGES_ERROR[error.code] ?? error.message ?? 'Error desconegut del servidor'
  if (ultimaAccio === 'unir') {
    errorUnir.value = text
  } else {
    errorCrear.value = text
  }
})
</script>





<template>
  <v-container>
    <h2 class="text-center mb-6">HowMuch?LIVE</h2>

    <v-text-field placeholder="Introdueix el teu nom de jugador" v-model="nomInput" label="Nom" :error-messages="error"
      @keyup.enter="registrar" />

    <v-btn @click="registrar">Registrar</v-btn>

    <p v-if="player.estaRegistrat" class="mt-4">
      Endavant, {{ player.nom }}!
    </p>


    <div class="fila-codi">
      <v-text-field v-model="codiSala" label="Codi de sala" :error-messages="errorUnir" @keyup.enter="unirse" />
      <v-btn @click="unirse">Unir-se</v-btn>
    </div>

    <div class="mt-6">
      <v-btn @click="obrirCrearSala">Crear sala</v-btn>
      <p v-if="errorCrear" class="text-error mt-2">{{ errorCrear }}</p>
    </div>

    <v-dialog v-model="dialogCrear" max-width="500">
      <v-card title="Crear sala">
        <v-card-text>
          <v-radio-group v-model="configSala.visibilitat" label="Visibilitat">
            <v-radio label="Privada" value="privada" />
            <v-radio label="Pública" value="publica" />
          </v-radio-group>

          <v-select v-model="configSala.maxJugadors" :items="opcionsJugadors" label="Màxim de jugadors" />

          <v-select v-model="configSala.rondes" :items="opcionsRondes" label="Nombre de rondes" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialogCrear = false">Cancel·lar</v-btn>
          <v-btn @click="crearSala">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>


<style scoped>
.fila-codi {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
</style>