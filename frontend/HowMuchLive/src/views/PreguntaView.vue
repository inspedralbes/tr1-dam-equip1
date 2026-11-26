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
const valor = ref(hiHaRang ? Math.round((game.minim + game.maxim) / 2) : 0);
const enviada = ref(false);

function enviarResposta() {
  if (enviada.value) return;
  enviada.value = true;
  connexio.enviar({ type: "submitAnswer", answer: valor.value });
}

watch(
  () => game.fase,
  (fase) => {
    if (fase === "ROUND_RESULTS") {
      router.replace({ name: "resultats-ronda" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="pregunta-wrapper panel-enter">
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

      <div class="studio-card pregunta-card">
        <div class="pregunta-text">{{ game.pregunta }}</div>
      </div>

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
  width: min(940px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 16px;
  gap: 10px;
}

.player-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.nom-header {
  font-size: clamp(15px, 2vw, 18px);
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
  min-width: 110px;
  display: flex;
  justify-content: flex-end;
}

.timer-badge {
  font-size: 14px;
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
  min-height: clamp(84px, 13vh, 126px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(18px, 2.5vw, 28px) clamp(18px, 3vw, 34px);
}

.pregunta-text {
  font-size: clamp(19px, 2.2vw, 27px);
  color: #ffffff;
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
}

.slider-box {
  width: 100%;
  margin-top: clamp(20px, 3.2vh, 34px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.slider-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(820px, 100%);
  gap: 16px;
}

.val-label {
  font-size: clamp(14px, 1.8vw, 17px);
  color: #94a3b8;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.unit-muted {
  font-size: 13px;
  color: #64748b;
}

.pregunta-slider {
  flex: 1 1 auto;
  min-width: 0;
}

.estimacio-label {
  font-size: clamp(17px, 2.2vw, 21px);
  color: #cbd5e1;
  background-color: #181d28;
  border: 1px solid #2a3346;
  border-radius: 10px;
  padding: 10px 24px;
  font-weight: 700;
  margin-top: clamp(16px, 2.4vh, 22px);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.estimacio-num {
  color: #5eead4;
  font-weight: 800;
  margin: 0 4px;
}

.estimacio-unit {
  color: #94a3b8;
  font-size: 15px;
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
  margin-top: 16px;
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
  width: min(560px, 100%);
  background-color: #181d28;
  border-radius: 12px;
  border: 1px solid #2a3346;
  padding: 16px 20px;
  margin-top: clamp(20px, 3vh, 30px);
}

.posicions-title {
  font-size: 13px;
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

@media (min-width: 1440px) and (min-height: 820px) {
  .pregunta-wrapper {
    width: min(1100px, 100%);
  }
  .slider-row {
    width: min(960px, 100%);
  }
  .posicions-card {
    width: min(680px, 100%);
  }
}

@media (max-width: 640px) {
  .timer-slot {
    min-width: auto;
  }
  .slider-row {
    flex-wrap: wrap;
    row-gap: 6px;
  }
  .pregunta-slider {
    order: 1;
    flex: 1 1 100%;
    width: 100%;
  }
  .slider-row > .val-label:first-child {
    order: 2;
  }
  .slider-row > .val-label:last-child {
    order: 3;
    margin-left: auto;
  }
  .btn-submit {
    width: 100%;
  }
}
</style>
