import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from '@/stores/player'

// la configuracio per defecte de la sala
export const CONFIG_PER_DEFECTE = {
  visibilitat: 'privada',
  maxJugadors: 10,
  rondes: 10
}

function convertirParticipants(llista) {
  return llista.map((p, i) => ({
    nom: p.name,
    esHost: p.isHost ?? i === 0 // TEMPORAL: el servidor encara no envia isHost
  }))
}

export const useRoomStore = defineStore('room', () => {
  // Estat
  const codi = ref('')
  const participants = ref([])
  const esHost = ref(false)
  const config = ref({ ...CONFIG_PER_DEFECTE })

  // Getter
  const nombreParticipants = computed(() => participants.value.length)

  // Accions PROVISIONALS (es substituiran quan hi hagi servidor)
  function crearSalaProva(nomHost, novaConfig) {
    codi.value = String(Math.floor(1000 + Math.random() * 9000))
    participants.value = [{ nom: nomHost, esHost: true }]
    esHost.value = true
    config.value = { ...novaConfig }
  }

  function unirseSalaProva(nom, codiSala) {
    codi.value = codiSala
    participants.value = [
      { nom: 'Anna', esHost: true },
      { nom: 'Marc', esHost: false },
      { nom, esHost: false }
    ]
    esHost.value = false
    config.value = { ...CONFIG_PER_DEFECTE }
  }

  function entrarSala(missatge) {
    codi.value = String(missatge.roomId)
    esHost.value = missatge.isHost
    config.value = { ...missatge.config }
    participants.value = convertirParticipants(missatge.players)
  }

  function actualitzarParticipants(llista) {
    const player = usePlayerStore()
    participants.value = convertirParticipants(llista)

    const jo = participants.value.find((p) => p.nom === player.nom)
    esHost.value = jo ? jo.esHost : false
  }

  function sortir() {
    codi.value = ''
    participants.value = []
    esHost.value = false
    config.value = { ...CONFIG_PER_DEFECTE }
  }

  return { codi, participants, esHost, config, nombreParticipants, crearSalaProva, unirseSalaProva, entrarSala, actualitzarParticipants, sortir }
})