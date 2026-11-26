<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { usePlayerStore } from "@/stores/player";
import AvatarBadge from "@/components/AvatarBadge.vue";

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();
const player = usePlayerStore();

const hiHaRang = game.minim !== null && game.maxim !== null;
// Si ja havíem respost abans de recarregar, tornem a mostrar la nostra resposta
const valor = ref(
  game.mevaResposta ?? (hiHaRang ? Math.round((game.minim + game.maxim) / 2) : 0),
);
const enviada = ref(game.mevaResposta !== null);

function enviarResposta() {
  if (enviada.value) return;
  enviada.value = true;
  connexio.enviar({ type: "submitAnswer", answer: valor.value });
}

watch(
  () => game.fase,
  (fase) => {
    if (fase === "ROUND_RESULTS") {
      router.push({ name: "resultats-ronda" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="pregunta-wrapper panel-enter">
      <!-- TOP BAR -->
      <div class="top-bar">
        <div class="player-pill">
          <AvatarBadge :avatar-id="player.avatar" :size="34" />
          <span class="nom-header">{{ player.nom }}</span>
        </div>

        <div class="ronda-badge">
          Ronda {{ game.ronda }} / {{ game.totalRondes }}
        </div>

        <div class="timer-slot">
          <div
            v-if="game.segonsRestants !== null"
            class="timer-badge"
            :class="{ 'is-urgent': game.segonsRestants <= 5 }"
          >
            Temps: {{ game.segonsRestants }}s
          </div>
        </div>
      </div>

      <!-- PREGUNTA CARD -->
      <div class="studio-card pregunta-card">
        <div class="pregunta-text">{{ game.pregunta }}</div>
      </div>

      <!-- SLIDER CONTROLS -->
      <div v-if="hiHaRang" class="slider-box">
        <div class="slider-row">
          <span class="val-label">{{ game.minim?.toLocaleString("ca-ES") }}</span>
          <v-slider
            v-model="valor"
            :min="game.minim"
            :max="game.maxim"
            :step="1"
            :disabled="enviada"
            hide-details
            color="#14b8a6"
            track-color="#252d3e"
            thumb-color="#14b8a6"
            class="pregunta-slider"
          />
          <span class="val-label">
            {{ game.maxim?.toLocaleString("ca-ES") }}
            <span v-if="game.unitat" class="unit-muted">{{ game.unitat }}</span>
          </span>
        </div>

        <div class="estimacio-label">
          Estimació: <span class="estimacio-num">{{ valor.toLocaleString("ca-ES") }}</span>
          <span v-if="game.unitat" class="estimacio-unit">{{ game.unitat }}</span>
        </div>

        <v-btn
          class="btn-submit"
          :class="{ 'is-sent': enviada }"
          :disabled="enviada"
          @click="enviarResposta"
          flat
        >
          {{ enviada ? "Resposta enviada" : "Enviar estimació" }}
        </v-btn>
      </div>

      <div v-else class="text-center mt-6">
        <p class="text-white">El servidor no ha enviat el rang de la pregunta.</p>
      </div>

      <!-- RESPOSTES EN DIRECTE -->
      <div class="posicions-card">
        <div class="posicions-title">
          Han respost {{ game.respostes.length }} de {{ game.totalJugadors }}
        </div>
        <div class="answered-chips">
          <span v-for="r in game.respostes" :key="r.id" class="answered-chip">
            {{ r.nom }}
          </span>
          <span v-if="game.respostes.length === 0" class="answered-empty">
            Esperant respostes...
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pregunta-wrapper {
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 18px;
  gap: 12px;
}

.player-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.nom-header {
  font-size: 18px;
  color: #ffffff;
  font-weight: 700;
}

.ronda-badge {
  font-size: 13px;
  color: #94a3b8;
  background-color: #181d28;
  border: 1px solid #2a3346;
  border-radius: 999px;
  padding: 5px 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.timer-slot {
  min-width: 120px;
  display: flex;
  justify-content: flex-end;
}

.timer-badge {
  font-size: 15px;
  color: #fda4af;
  background-color: #2a151d;
  border: 1px solid #f43f5e;
  padding: 5px 14px;
  border-radius: 8px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.timer-badge.is-urgent {
  background-color: #f43f5e;
  color: #ffffff;
}

.pregunta-card {
  width: 100%;
  min-height: 104px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 32px;
}

.pregunta-text {
  font-size: 24px;
  color: #ffffff;
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
}

.slider-box {
  width: 100%;
  margin-top: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.slider-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(760px, 100%);
  gap: 16px;
}

.val-label {
  font-size: 17px;
  color: #94a3b8;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.unit-muted {
  font-size: 14px;
  color: #64748b;
}

.pregunta-slider {
  flex: 1;
}

.estimacio-label {
  font-size: 21px;
  color: #cbd5e1;
  background-color: #181d28;
  border: 1px solid #2a3346;
  border-radius: 10px;
  padding: 10px 26px;
  font-weight: 700;
  margin-top: 22px;
  font-variant-numeric: tabular-nums;
}

.estimacio-num {
  color: #5eead4;
  font-weight: 800;
  margin: 0 4px;
}

.estimacio-unit {
  color: #94a3b8;
  font-size: 16px;
}

.btn-submit {
  min-width: 210px;
  height: 46px !important;
  padding: 0 26px !important;
  background-color: #14b8a6 !important;
  color: #0b1116 !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  margin-top: 18px;
  box-shadow: none !important;
}

.btn-submit:hover:not(:disabled) {
  background-color: #0d9488 !important;
  color: #ffffff !important;
}

.btn-submit.is-sent {
  background-color: #102a27 !important;
  color: #5eead4 !important;
  border: 1px solid #14b8a6 !important;
  opacity: 1 !important;
}

.posicions-card {
  width: min(460px, 100%);
  background-color: #181d28;
  border-radius: 12px;
  border: 1px solid #2a3346;
  padding: 16px 20px;
  margin-top: 30px;
}

.posicions-title {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a3346;
}

.answered-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.answered-chip {
  background: #121620;
  border: 1px solid #2a3346;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
}

.answered-empty {
  color: #64748b;
  font-size: 13px;
}
</style>
