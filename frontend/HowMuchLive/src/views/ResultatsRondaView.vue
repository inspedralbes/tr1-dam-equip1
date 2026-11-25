<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useGameStore } from '@/stores/game'
import { useRoomStore } from '@/stores/room'

const router = useRouter()
const connexio = useConnectionStore()
const game = useGameStore()
const room = useRoomStore()

const enviat = ref(false)

// La resposta correcta es compta des de 0 fins al valor real (efecte "comptador")
const respostaMostrada = ref(0)

function animarResposta() {
    const final = game.respostaCorrecta
    if (typeof final !== 'number') {
        respostaMostrada.value = final
        return
    }
    const durada = 900 // ms
    const inici = performance.now()

    function pas(ara) {
        const t = Math.min((ara - inici) / durada, 1)
        const suau = 1 - Math.pow(1 - t, 3) // va ràpid al principi i frena al final
        respostaMostrada.value = t < 1 ? Math.round(final * suau) : final
        if (t < 1) requestAnimationFrame(pas)
    }
    requestAnimationFrame(pas)
}

onMounted(animarResposta)

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
    if (fase === 'GAME_OVER') {
        router.push({ name: 'final' })
    }
})
</script>

<template>
    <div class="hm-page">
        <section class="hm-card resultats-card">
            <header class="card-header">
                <span class="ronda-badge">Ronda {{ game.ronda }} de {{ game.totalRondes }}</span>
                <h2 class="pregunta">{{ game.pregunta }}</h2>
            </header>

            <div class="resposta-correcta hm-pop">
                <span class="resposta-label">Resposta correcta</span>
                <span class="resposta-valor">
                    {{ respostaMostrada?.toLocaleString('ca-ES') }} {{ game.unitat }}
                </span>
            </div>

            <div class="columnes">
                <div>
                    <h3 class="section-title">Resultats de la ronda</h3>
                    <ul class="rank-list hm-escalonat">
                        <li v-for="(r, i) in game.resultats" :key="r.id" class="rank-item" :style="{ '--i': i }">
                            <span class="rank-name">{{ r.name }}</span>
                            <span class="hm-muted estimacio">
                                {{ r.estimate === null ? 'No ha respost' : r.estimate.toLocaleString('ca-ES') + ' ' + game.unitat }}
                            </span>
                            <span class="punts-ronda" :class="{ zero: !r.roundPoints }" :style="{ '--i': i }">+{{ r.roundPoints ?? 0 }}</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="section-title">Classificació</h3>
                    <ol class="rank-list hm-escalonat">
                        <li v-for="(j, i) in game.classificacio" :key="j.id" class="rank-item" :class="'rank-' + (i + 1)" :style="{ '--i': i + 2 }">
                            <span class="rank-pos">{{ i + 1 }}</span>
                            <span class="rank-name">{{ j.name }}</span>
                            <span class="rank-score">{{ j.score }} pts</span>
                        </li>
                    </ol>
                </div>
            </div>

            <div class="actions">
                <v-btn v-if="room.esHost" class="btn-primary" color="primary" :disabled="enviat" @click="seguent">
                    {{ game.ronda >= game.totalRondes ? 'Veure el resultat final' : 'Següent ronda' }}
                </v-btn>
                <p v-else class="hm-muted espera">Esperant que l'amfitrió passi a la següent ronda…</p>
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

.card-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hm-border);
}

.ronda-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--hm-primary-light);
  background: var(--hm-primary-soft);
  border: 1px solid var(--hm-primary);
  border-radius: 999px;
}

.pregunta {
  margin: 12px 0 0;
  font-size: 22px;
  line-height: 1.35;
  color: var(--hm-text);
}

.resposta-correcta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  padding: 16px 20px;
  background: var(--hm-primary-soft);
  border: 1px solid var(--hm-primary);
  border-radius: var(--hm-radius-sm);
}

.resposta-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--hm-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.resposta-valor {
  font-size: 28px;
  font-weight: 800;
  color: var(--hm-primary);
}

.columnes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.estimacio {
  font-size: 14px;
  white-space: nowrap;
}

.punts-ronda {
  min-width: 48px;
  text-align: right;
  font-weight: 700;
  color: var(--hm-success);
}

.punts-ronda.zero {
  color: var(--hm-text-muted);
}

/* Els punts guanyats fan "pop" una mica després que aparegui la fila */
.punts-ronda:not(.zero) {
  display: inline-block;
  animation: hm-pop 0.45s ease both;
  animation-delay: calc(var(--i, 0) * 80ms + 550ms);
}

.rank-item {
  transition: background-color 0.2s ease;
}

.rank-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Lluïssor suau al primer de la classificació */
.rank-1 {
  background: linear-gradient(90deg, transparent 30%, rgba(251, 191, 36, 0.1) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: hm-entrada 0.4s ease both, hm-brillantor 3s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 80ms + 150ms), 1s;
}

.espera {
  margin: 0;
  font-style: italic;
}

@media (max-width: 760px) {
  .columnes {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
