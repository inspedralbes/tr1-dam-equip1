<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'
import { useRoomStore } from '@/stores/room'

const connexio = useConnectionStore()
const game = useGameStore()
const room = useRoomStore()

const categoriaVotada = ref('')

function votar(categoria) {
  if (categoriaVotada.value !== '') return
  categoriaVotada.value = categoria
  connexio.enviar({ type: 'voteCategory', category: categoria })
}

function tancarVotacio() {
  connexio.enviar({ type: 'endCategoryVote' })
}

function comencarRonda() {
  connexio.enviar({ type: 'startRound' })
}

const router = useRouter()

watch(() => game.fase, (fase) => {
  if (fase === 'QUESTION') {
    router.push({ name: 'pregunta' })
  }
})
</script>

<template>
  <v-container>
    <h2>Votació de categories</h2>

    <div v-if="game.fase === 'VOTING_CATEGORY'">
      <p>Han votat {{ game.votsRebuts }} de {{ game.totalJugadors }}</p>

      <v-btn v-for="c in game.categories" :key="c" class="d-block mb-2" color="primary"
        :variant="categoriaVotada === c ? 'flat' : 'outlined'"
        :disabled="categoriaVotada !== '' && categoriaVotada !== c" @click="votar(c)">
        {{ c }}
      </v-btn>

      <v-list>
        <v-list-item v-for="v in game.vots" :key="v.id" :title="v.nom" :subtitle="v.categoria" />
      </v-list>

      <v-btn v-if="room.esHost" @click="tancarVotacio">Tancar votació</v-btn>
    </div>

    <div v-else-if="game.fase === 'CATEGORY_CHOSEN'">
      <p>Categoria triada: {{ game.categoriaGuanyadora }}</p>

      <v-list>
        <v-list-item v-for="(n, categoria) in game.recompte" :key="categoria" :title="categoria"
          :subtitle="n + ' vots'" />
      </v-list>

      <v-btn v-if="room.esHost" @click="comencarRonda">Començar ronda</v-btn>
    </div>
  </v-container>
</template>