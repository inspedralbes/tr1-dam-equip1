<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { useRoomStore } from '@/stores/room'

const player = usePlayerStore()
const room = useRoomStore()

const router = useRouter()
const connexio = useConnectionStore()
const game = useGameStore()

const copiat = ref(false)

async function copiarCodi() {
    try {
        await navigator.clipboard.writeText(room.codi)
        copiat.value = true
        setTimeout(() => {
            copiat.value = false
        }, 2000)
    } catch (e) {
        console.error('No s\'ha pogut copiar el codi', e)
    }
}

function iniciarPartida() {
    connexio.enviar({ type: 'startCategoryVote' })
}
watch(() => game.fase, (fase) => {
    if (fase === 'VOTING_CATEGORY') {
        router.push({ name: 'categories' })
    }
})
</script>

<template>
    <v-container>
        <p>{{ player.nom }}</p>

        <div class="capcalera-codi">
            <h1>{{ room.codi }}</h1>
            <v-btn @click="copiarCodi">{{ copiat ? 'Copiat!' : 'Copiar codi' }}</v-btn>
        </div>
        <div class="fila-participants">
            <p>Participants: {{ room.nombreParticipants }}</p>
            <v-btn v-if="room.esHost" @click="iniciarPartida">Iniciar partida</v-btn>
        </div>

        <v-list class="llista-participants">
            <v-list-item v-for="p in room.participants" :key="p.nom" :title="p.nom"
                :subtitle="p.esHost ? 'Amfitrió' : undefined" />
        </v-list>
    </v-container>
</template>

<style scoped>
.capcalera-codi {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.llista-participants {
    min-height: 300px;
}
</style>