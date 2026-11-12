import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// la configuracio per defecte de la sala
export const CONFIG_PER_DEFECTE = {
  visibilitat: 'privada',
  maxJugadors: 10,
  rondes: 10
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

  function sortir() {
    codi.value = ''
    participants.value = []
    esHost.value = false
    config.value = { ...CONFIG_PER_DEFECTE }
  }

  return { codi, participants, esHost, config, nombreParticipants, crearSalaProva, unirseSalaProva, sortir }
})