<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'
import { useRoomStore } from '@/stores/room'

const router = useRouter()
const connexio = useConnectionStore()
const game = useGameStore()
const room = useRoomStore()

const enviat = ref(false)

function seguent() {
    if (enviat.value) return
    enviat.value = true
    connexio.enviar({ type: 'nextRound' })
}

function subtitol(r) {
    if (r.estimate === null) return 'No ha respost · +0 punts'
    return `${r.estimate.toLocaleString('ca-ES')} ${game.unitat} · +${r.roundPoints} punts`
}

watch(() => game.fase, (fase) => {
    if (fase === 'QUESTION') {
        router.push({ name: 'pregunta' })
    }
})
</script>

<template>
    <v-container>
        <h3>Ronda {{ game.ronda }} de {{ game.totalRondes }}</h3>
        <h2>{{ game.pregunta }}</h2>
        <p>Resposta correcta: {{ game.respostaCorrecta?.toLocaleString('ca-ES') }} {{ game.unitat }}</p>

        <h3 class="mt-4">Resultats de la ronda</h3>
        <v-list>
            <v-list-item v-for="r in game.resultats" :key="r.id" :title="r.name" :subtitle="subtitol(r)" />
        </v-list>

        <h3 class="mt-4">Classificació</h3>
        <v-list>
            <v-list-item v-for="(j, i) in game.classificacio" :key="j.id" :title="(i + 1) + '. ' + j.name"
                :subtitle="j.score + ' punts'" />
        </v-list>

        <v-btn v-if="room.esHost" :disabled="enviat" @click="seguent">
            {{ game.ronda >= game.totalRondes ? 'Veure el resultat final' : 'Següent ronda' }}
        </v-btn>
    </v-container>
</template>