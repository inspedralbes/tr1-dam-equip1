<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { useRoomStore } from "@/stores/room";
import { usePlayerStore } from "@/stores/player";
import AvatarBadge from "@/components/AvatarBadge.vue";

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();
const room = useRoomStore();
const player = usePlayerStore();

const enviat = ref(false);

function seguent() {
  if (enviat.value) return;
  enviat.value = true;
  connexio.enviar({ type: "nextRound" });
}

const minVal = computed(() => (game.minim !== null ? Number(game.minim) : 0));
const maxVal = computed(() => (game.maxim !== null ? Number(game.maxim) : 100));
const rangeVal = computed(() => Math.max(1, maxVal.value - minVal.value));

function clampPct(val) {
  const pct = ((Number(val) - minVal.value) / rangeVal.value) * 100;
  return Math.max(4, Math.min(96, pct));
}

// Calculem pins escalonats en 4 altures perquè no es solapin noms propers (igual que a Unity!)
const pins = computed(() => {
  const valid = (game.resultats || []).filter((r) => r.estimate !== null && r.estimate !== undefined);
  const sorted = [...valid].sort((a, b) => a.estimate - b.estimate);
  const lastPctAtTier = [-999, -999, -999, -999];

  return sorted.map((res) => {
    const pct = clampPct(res.estimate);
    let tier = 0;
    let found = false;
    for (let t = 0; t < 4; t++) {
      if (pct - lastPctAtTier[t] >= 14) {
        tier = t;
        found = true;
        break;
      }
    }
    if (!found) {
      let maxDiff = -1;
      for (let t = 0; t < 4; t++) {
        const diff = pct - lastPctAtTier[t];
        if (diff > maxDiff) {
          maxDiff = diff;
          tier = t;
        }
      }
    }
    lastPctAtTier[tier] = pct;
    const height = 40 + tier * 30;
    return {
      ...res,
      pct,
      height,
      stemHeight: Math.max(8, height - 24),
      isMe: res.name === player.nom,
    };
  });
});

const correctPct = computed(() => clampPct(game.respostaCorrecta ?? 0));

watch(
  () => game.fase,
  (fase) => {
    if (fase === "QUESTION") {
      router.push({ name: "pregunta" });
    }
    if (fase === "GAME_OVER") {
      router.push({ name: "final" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="results-wrapper panel-enter">
      <!-- TOP BAR -->
      <div class="top-bar">
        <div class="player-pill">
          <AvatarBadge :avatar-id="player.avatar" :size="34" />
          <span class="nom-header">{{ player.nom }}</span>
        </div>

        <div class="ronda-badge">
          Ronda {{ game.ronda }} / {{ game.totalRondes }}
        </div>

        <div class="action-slot">
          <v-btn
            v-if="room.esHost"
            class="btn-next"
            :disabled="enviat"
            @click="seguent"
          >
            {{ game.ronda >= game.totalRondes ? "Resultat final" : "Següent" }}
          </v-btn>
        </div>
      </div>

      <!-- PREGUNTA I RESPOSTA CORRECTA -->
      <div class="studio-card pregunta-card">
        <div class="pregunta-text">{{ game.pregunta }}</div>
        <div class="correct-pill">
          Resposta correcta:
          <strong>
            {{ game.respostaCorrecta?.toLocaleString("ca-ES") }}
            {{ game.unitat }}
          </strong>
        </div>
      </div>

      <!-- ESCALA + POSICIONS -->
      <div class="resposta-main">
        <!-- Escala i línies marcadores (esquerra) -->
        <div class="scale-section">
          <div class="markers-container">
            <div
              v-for="pin in pins"
              :key="pin.id"
              class="marker-pin"
              :style="{ left: pin.pct + '%', height: pin.height + 'px' }"
            >
              <div class="marker-badge" :class="{ 'is-me': pin.isMe }">
                {{ pin.name }} ({{ pin.estimate?.toLocaleString("ca-ES") }})
              </div>
              <div class="marker-stem" :style="{ height: pin.stemHeight + 'px' }"></div>
              <div class="marker-dot" :class="{ 'is-me': pin.isMe }"></div>
            </div>

            <!-- Marcador destacat de la resposta correcta -->
            <div
              class="marker-pin marker-correct-pin"
              :style="{ left: correctPct + '%', height: '164px' }"
            >
              <div class="marker-correct-badge">
                Resposta: {{ game.respostaCorrecta?.toLocaleString("ca-ES") }}
                {{ game.unitat }}
              </div>
              <div class="marker-correct-stem"></div>
              <div class="marker-correct-dot"></div>
            </div>
          </div>

          <div class="scale-bar"></div>
          <div class="scale-labels-row">
            <span class="scale-bound">{{ minVal.toLocaleString("ca-ES") }}</span>
            <span class="scale-bound">
              {{ maxVal.toLocaleString("ca-ES") }} {{ game.unitat }}
            </span>
          </div>
        </div>

        <!-- Caixa de posicions de la ronda (dreta) -->
        <div class="studio-card posicions-card">
          <div class="posicions-title">Posicions ronda</div>
          <div class="posicions-list">
            <div v-for="(r, i) in game.resultats" :key="r.id" class="posicio-item">
              <div class="posicio-left">
                <span class="pos-rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
                <AvatarBadge :avatar-id="r.avatar ?? 0" :size="26" />
                <span class="pos-name">{{ r.name }}</span>
              </div>
              <span class="pos-pts">+{{ r.roundPoints }} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-wrapper {
  width: min(1040px, 100%);
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

.action-slot {
  min-width: 130px;
  display: flex;
  justify-content: flex-end;
}

.btn-next {
  background-color: #14b8a6 !important;
  color: #0b1116 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  padding: 0 22px !important;
  height: 42px !important;
  box-shadow: none !important;
}

.btn-next:hover {
  background-color: #0d9488 !important;
  color: #ffffff !important;
}

.pregunta-card {
  width: 100%;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pregunta-text {
  font-size: 22px;
  color: #ffffff;
  font-weight: 800;
  text-align: center;
}

.correct-pill {
  font-size: 17px;
  color: #5eead4;
  background: #102a27;
  border: 1px solid #14b8a6;
  padding: 6px 18px;
  border-radius: 8px;
}

.resposta-main {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-top: 26px;
  gap: 24px;
  align-items: flex-end;
}

.scale-section {
  flex: 1 1 65%;
  position: relative;
  padding: 14px 10px 0;
}

.markers-container {
  width: 100%;
  height: 180px;
  position: relative;
}

.marker-pin {
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  z-index: 2;
}

.marker-badge {
  background-color: #181d28;
  border: 1px solid #334155;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  padding: 3px 9px;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}

.marker-badge.is-me {
  background-color: #102a27;
  border-color: #14b8a6;
  color: #5eead4;
}

.marker-stem {
  width: 2px;
  background-color: #64748b;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #64748b;
  margin-top: -3px;
}

.marker-dot.is-me {
  background-color: #14b8a6;
}

.marker-correct-pin {
  z-index: 5;
}

.marker-correct-badge {
  background-color: #14b8a6;
  color: #0b1116;
  font-size: 13px;
  font-weight: 800;
  border-radius: 6px;
  padding: 4px 12px;
  white-space: nowrap;
  box-shadow: 0 6px 16px rgba(20, 184, 166, 0.35);
}

.marker-correct-stem {
  width: 3px;
  height: 130px;
  background-color: #14b8a6;
}

.marker-correct-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #5eead4;
  margin-top: -4px;
}

.scale-bar {
  width: 100%;
  height: 18px;
  background-color: #121620;
  border: 1px solid #2a3346;
  border-radius: 9px;
}

.scale-labels-row {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.scale-bound {
  font-size: 15px;
  color: #94a3b8;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.posicions-card {
  flex: 0 0 310px;
  padding: 18px 20px;
}

.posicions-title {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a3346;
}

.posicions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.posicio-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #121620;
  border: 1px solid #252d3e;
  border-radius: 8px;
  padding: 7px 10px;
}

.posicio-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pos-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #262e3f;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pos-rank.rank-1 {
  background: #b45309;
  color: #fef3c7;
}

.pos-rank.rank-2 {
  background: #475569;
  color: #f8fafc;
}

.pos-rank.rank-3 {
  background: #7c2d12;
  color: #fed7aa;
}

.pos-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.pos-pts {
  font-size: 13px;
  font-weight: 800;
  color: #5eead4;
}

@media (max-width: 820px) {
  .resposta-main {
    flex-direction: column;
    align-items: stretch;
  }
  .posicions-card {
    flex: 1 1 auto;
  }
}
</style>
