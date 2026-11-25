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

function tornarAJugar() {
    if (enviat.value) return
    enviat.value = true
    connexio.enviar({ type: 'restartGame' })
}

async function sortir() {
    connexio.desconnectar()
    await router.push({ name: 'home' })
    game.reiniciar()
    room.sortir()
}

watch(() => game.fase, (fase) => {
    if (fase === 'LOBBY') {
        router.push({ name: 'sala-espera' })
    }
})
</script>

<template>
    <v-container>
        <h2>Partida acabada</h2>

        <h3 class="mt-4">Classificació final</h3>
        <v-list>
            <v-list-item v-for="(j, i) in game.classificacioFinal" :key="j.id" :title="(i + 1) + '. ' + j.name"
                :subtitle="j.score + ' punts'" />
        </v-list>

        <v-btn v-if="room.esHost" class="mr-2" :disabled="enviat" @click="tornarAJugar">
            Tornar a jugar
        </v-btn>
        <v-btn @click="sortir">Sortir</v-btn>
    </v-container>
</template>