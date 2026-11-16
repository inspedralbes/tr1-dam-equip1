import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from '@/stores/player'

export const CONFIG_PER_DEFECTE = {
  visibilitat: 'privada',
  maxJugadors: 10,
  rondes: 10
}

function convertirParticipants(llista) {
  return llista.map((p, i) => ({
    nom: p.name,
    // l'amfitrió és el primer de la llista
    esHost: p.isHost ?? i === 0
  }))
}

export const useRoomStore = defineStore('room', () => {
  const codi = ref('')
  const participants = ref([])
  const esHost = ref(false)

  const nombreParticipants = computed(() => participants.value.length)

  const nomEnSala = ref('')

  function entrarSala(missatge) {
    esHost.value = missatge.isHost
    nomEnSala.value = missatge.name ?? usePlayerStore().nom
    participants.value = convertirParticipants(missatge.players)
    codi.value = String(missatge.roomId)
  }

  function actualitzarParticipants(llista) {
    participants.value = convertirParticipants(llista)

    const jo = participants.value.find((p) => p.nom === nomEnSala.value)
    esHost.value = jo ? jo.esHost : false
  }

  function sortir() {
    codi.value = ''
    participants.value = []
    esHost.value = false
    nomEnSala.value = ''
  }

  return { codi, participants, esHost, nombreParticipants, nomEnSala, entrarSala, actualitzarParticipants, sortir }
})