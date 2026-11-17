<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const connexio = useConnectionStore()
const game = useGameStore()

const hiHaRang = game.minim !== null && game.maxim !== null
const valor = ref(hiHaRang ? Math.round((game.minim + game.maxim) / 2) : 0)
const enviada = ref(false)

function enviarResposta() {
  if (enviada.value) return
  enviada.value = true
  connexio.enviar({ type: 'submitAnswer', answer: valor.value })
}

watch(() => game.fase, (fase) => {
  if (fase === 'ROUND_RESULTS') {
    router.push({ name: 'resultats-ronda' })
  }
})
</script>

<template>
  <v-container>
    <h3>Ronda {{ game.ronda }} de {{ game.totalRondes }}</h3>
    <h2>{{ game.pregunta }}</h2>

    <p v-if="game.segonsRestants !== null">Temps restant: {{ game.segonsRestants }} s</p>

    <div v-if="hiHaRang">
      <p>La teva resposta: {{ valor.toLocaleString('ca-ES') }} {{ game.unitat }}</p>
      <v-slider v-model="valor" :min="game.minim" :max="game.maxim" :step="1" :disabled="enviada" />
      <v-btn :disabled="enviada" @click="enviarResposta">
        {{ enviada ? 'Resposta enviada' : 'Enviar resposta' }}
      </v-btn>
    </div>
    <p v-else>El servidor no ha enviat el rang de la pregunta.</p>

    <p class="mt-4">Han respost {{ game.respostes.length }} de {{ game.totalJugadors }}</p>
    <v-list>
      <v-list-item v-for="r in game.respostes" :key="r.id" :title="r.nom" />
    </v-list>
  </v-container>
</template>