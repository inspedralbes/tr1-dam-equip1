<script setup>
import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'

const connexio = useConnectionStore()
const game = useGameStore()

const hiHaRang = game.min !== null && game.max !== null
const valor = ref(hiHaRang ? Math.round((game.minim + game.maxim) / 2) : 0)
const enviada = ref(false)

function enviarResposta() {
  if (enviada.value) return
  enviada.value = true
  connexio.enviar({ type: 'submitAnswer', answer: valor.value })
}
</script>

<template>
  <v-container>
    <h3>Ronda {{ game.ronda }}</h3>
    <h2>{{ game.pregunta }}</h2>

    <div v-if="hiHaRang">
      <p>La teva resposta: {{ valor}}</p>
      <v-slider
        v-model="valor"
        :min="game.minim"
        :max="game.maxim"
        :step="1"
        :disabled="enviada"
      />
      <v-btn :disabled="enviada" @click="enviarResposta">
        {{ enviada ? 'Resposta enviada' : 'Enviar resposta' }}
      </v-btn>
    </div>
    <p v-else>Per aquesta pregunta no hi ha rang.</p>

    <p class="mt-4">Han respost {{ game.respostes.length }} de {{ game.totalJugadors }}</p>
    <v-list>
      <v-list-item v-for="r in game.respostes" :key="r.id" :title="r.nom" />
    </v-list>
  </v-container>
</template>