import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlayerStore = defineStore('player', () => {

  const nom = ref('')


  const estaRegistrat = computed(() => nom.value !== '')


  function registrarNom(nouNom) {
    const netejat = nouNom.trim()
    if (netejat === '') return false
    nom.value = netejat
    return true
  }

  return { nom, estaRegistrat, registrarNom }
})