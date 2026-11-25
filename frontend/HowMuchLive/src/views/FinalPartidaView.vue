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
    <div class="hm-page">
        <section class="hm-card final-card">
            <header class="final-header">
                <span class="trofeu" aria-hidden="true">🏆</span>
                <h2 class="final-title">Partida acabada</h2>
                <p v-if="game.classificacioFinal?.length" class="guanyador hm-entrada" style="animation-delay: 0.5s">
                    Guanya <strong>{{ game.classificacioFinal[0].name }}</strong>
                    amb {{ game.classificacioFinal[0].score }} punts
                </p>
            </header>

            <h3 class="section-title">Classificació final</h3>
            <ol class="rank-list hm-escalonat">
                <li v-for="(j, i) in game.classificacioFinal" :key="j.id" class="rank-item" :class="'rank-' + (i + 1)" :style="{ '--i': i + 4 }">
                    <span class="rank-pos">{{ i + 1 }}</span>
                    <span class="rank-name">{{ j.name }}</span>
                    <span class="rank-score">{{ j.score }} pts</span>
                </li>
            </ol>

            <div class="actions">
                <v-btn class="btn-secondary" variant="outlined" @click="sortir">Sortir</v-btn>
                <v-btn v-if="room.esHost" class="btn-primary" color="primary" :disabled="enviat" @click="tornarAJugar">
                    Tornar a jugar
                </v-btn>
            </div>
        </section>
    </div>
</template>

<style scoped>

.section-title {
  margin: 22px 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--hm-text-muted);
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  background: var(--hm-surface);
  border: 1px solid var(--hm-border);
  border-radius: var(--hm-radius-sm);
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: var(--hm-radius-sm);
}

.rank-item + .rank-item {
  border-top: 1px solid var(--hm-border);
}

.rank-pos {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  background: var(--hm-card);
  border: 1px solid var(--hm-border);
  color: var(--hm-text-muted);
}

.rank-1 .rank-pos { background: var(--hm-gold); border-color: var(--hm-gold); color: #181b22; }
.rank-2 .rank-pos { background: var(--hm-silver); border-color: var(--hm-silver); color: #181b22; }
.rank-3 .rank-pos { background: var(--hm-bronze); border-color: var(--hm-bronze); color: #181b22; }

.rank-name {
  flex: 1;
  font-weight: 600;
  color: var(--hm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-score {
  font-weight: 700;
  color: var(--hm-primary);
  white-space: nowrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  height: 44px !important;
  padding: 0 24px !important;
  font-weight: 700 !important;
  border-radius: var(--hm-radius-sm) !important;
  box-shadow: none !important;
}

.btn-secondary {
  height: 44px !important;
  padding: 0 20px !important;
  border-radius: var(--hm-radius-sm) !important;
  border: 1px solid var(--hm-border) !important;
  color: var(--hm-text-muted) !important;
}

.final-card {
  max-width: 640px;
}

.final-header {
  text-align: center;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--hm-border);
}

/* El trofeu entra amb un rebot i després flota suaument */
.trofeu {
  display: inline-block;
  font-size: 48px;
  line-height: 1;
  animation: trofeu-entra 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.4) both,
    trofeu-flota 3s ease-in-out 0.8s infinite;
}

@keyframes trofeu-entra {
  from {
    opacity: 0;
    transform: scale(0.3) rotate(-20deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes trofeu-flota {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.final-title {
  margin: 10px 0 4px;
  font-size: 28px;
  font-weight: 800;
  color: var(--hm-text);
}

.guanyador {
  margin: 0;
  color: var(--hm-text-muted);
}

.guanyador strong {
  color: var(--hm-gold);
}

/* Guanyador: fons daurat amb una lluïssor que hi passa per sobre */
.rank-1 {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.08) 30%, rgba(251, 191, 36, 0.2) 50%, rgba(251, 191, 36, 0.08) 70%);
  background-size: 200% 100%;
  animation: hm-entrada 0.4s ease both, hm-brillantor 3s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 80ms + 150ms), 1.2s;
}
</style>
