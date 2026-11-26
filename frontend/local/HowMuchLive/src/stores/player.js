import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const nom = ref('')
  const savedAvatar = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('player_avatar') || 0) : 0
  const avatar = ref(Number.isFinite(savedAvatar) ? savedAvatar : 0)

  const estaRegistrat = computed(() => nom.value !== '')

  function registrarNom(nouNom) {
    const netejat = nouNom.trim()
    if (netejat === '') return false
    nom.value = netejat
    return true
  }

  function seleccionarAvatar(id) {
    const num = Number.isFinite(Number(id)) ? Number(id) : 0
    avatar.value = num
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('player_avatar', String(num))
    }
  }

  return { nom, avatar, estaRegistrat, registrarNom, seleccionarAvatar }
})
