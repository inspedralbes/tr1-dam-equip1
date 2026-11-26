<script setup>
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useConnectionStore, hiHaSessioGuardada } from '@/stores/connection'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const connexio = useConnectionStore()
const game = useGameStore()

// Pantalla que toca segons la fase de la partida
const RUTA_PER_FASE = {
  LOBBY: 'sala-espera',
  VOTING_CATEGORY: 'categories',
  CATEGORY_CHOSEN: 'categories',
  QUESTION: 'pregunta',
  ROUND_RESULTS: 'resultats-ronda',
  GAME_OVER: 'final',
}

// Si hem recarregat la pàgina enmig d'una partida, hi tornem abans de pintar cap pantalla
// (així la pantalla es munta amb les dades ja carregades i no surt en blanc)
const recuperant = ref(hiHaSessioGuardada())

if (recuperant.value) {
  connexio.reconnectar().then(async (ok) => {
    await router.isReady()
    await router.replace({ name: ok ? RUTA_PER_FASE[game.fase] : 'home' })
    recuperant.value = false
  })
}
</script>

<template>
  <div v-if="recuperant" class="recuperant">
    <v-progress-circular indeterminate color="primary" size="48" />
    <p>Tornant a la partida...</p>
  </div>
  <RouterView v-else />
</template>

<style scoped>
.recuperant {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
</style>
