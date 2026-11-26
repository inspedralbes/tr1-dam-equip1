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
  return Math.max(5, Math.min(95, pct));
}

function buildSvgPath(badgePct, dotPct, bottomPct) {
  const xBadge = badgePct * 10;
  const xDot = dotPct * 10;
  const yBadge = 100 - bottomPct;
  const yDot = 98;

  if (Math.abs(xBadge - xDot) < 3) {
    return `M ${xBadge.toFixed(1)} ${yBadge.toFixed(1)} L ${xDot.toFixed(1)} ${yDot}`;
  }
  const midY = ((yBadge + yDot) / 2).toFixed(1);
  return `M ${xBadge.toFixed(1)} ${yBadge.toFixed(1)} C ${xBadge.toFixed(1)} ${midY}, ${xDot.toFixed(1)} ${midY}, ${xDot.toFixed(1)} ${yDot}`;
}

const scaleLayout = computed(() => {
  const valid = (game.resultats || []).filter(
    (r) => r.estimate !== null && r.estimate !== undefined
  );

  const playerGroups = [];
  valid.forEach((r) => {
    const val = Number(r.estimate);
    let grp = playerGroups.find((g) => g.estimate === val);
    if (!grp) {
      grp = {
        key: `grp-${val}-${playerGroups.length}`,
        estimate: val,
        pct: clampPct(val),
        isCorrect: false,
        items: [],
      };
      playerGroups.push(grp);
    }
    grp.items.push({
      ...r,
      isMe: r.name === player.nom,
    });
  });

  playerGroups.forEach((grp) => {
    grp.hasMe = grp.items.some((i) => i.isMe);
  });

  const correctVal =
    game.respostaCorrecta !== null && game.respostaCorrecta !== undefined
      ? Number(game.respostaCorrecta)
      : null;

  const correctPin =
    correctVal !== null
      ? {
          key: "correct-pin",
          estimate: correctVal,
          pct: clampPct(correctVal),
          isCorrect: true,
          items: [{ name: "Resposta", estimate: correctVal }],
          hasMe: false,
        }
      : null;

  const allPins = [...playerGroups];
  if (correctPin) {
    allPins.push(correctPin);
  }
  allPins.sort((a, b) => a.pct - b.pct);

  const tierBottoms = [18, 38, 58, 76];
  const lastPctAtTier = [-999, -999, -999, -999];

  allPins.forEach((p) => {
    if (p.isCorrect) {
      p.tier = 3;
      p.bottomPct = tierBottoms[3];
      lastPctAtTier[3] = p.pct;
      return;
    }
    let chosenTier = 0;
    let found = false;
    for (let t = 0; t < 3; t++) {
      if (p.pct - lastPctAtTier[t] >= 12) {
        chosenTier = t;
        found = true;
        break;
      }
    }
    if (!found) {
      let maxDiff = -1;
      for (let t = 0; t < 3; t++) {
        const diff = p.pct - lastPctAtTier[t];
        if (diff > maxDiff) {
          maxDiff = diff;
          chosenTier = t;
        }
      }
    }
    p.tier = chosenTier;
    p.bottomPct = tierBottoms[chosenTier];
    lastPctAtTier[chosenTier] = p.pct;
  });

  allPins.forEach((p) => {
    p.badgePct = p.pct;
  });

  const minBadgeDist = 14;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < allPins.length - 1; i++) {
      const p1 = allPins[i];
      const p2 = allPins[i + 1];
      const dist = p2.badgePct - p1.badgePct;
      if (dist < minBadgeDist) {
        const push = (minBadgeDist - dist) / 2;
        p1.badgePct = Math.max(6, p1.badgePct - push);
        p2.badgePct = Math.min(94, p2.badgePct + push);
      }
    }
  }

  allPins.forEach((p) => {
    p.path = buildSvgPath(p.badgePct, p.pct, p.bottomPct);
  });

  const players = allPins.filter((p) => !p.isCorrect);
  const correct = allPins.find((p) => p.isCorrect) || null;

  return {
    players,
    correct,
    all: allPins,
  };
});

watch(
  () => game.fase,
  (fase) => {
    if (fase === "QUESTION") {
      router.replace({ name: "pregunta" });
    }
    if (fase === "GAME_OVER") {
      router.replace({ name: "final" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="results-wrapper panel-enter">
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

      <div class="resposta-main">
        <div class="scale-section">
          <div class="markers-container">
            <svg class="markers-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
              <path
                v-for="pin in scaleLayout.players"
                :key="'path-' + pin.key"
                :d="pin.path"
                class="marker-stem"
                :class="{ 'is-me': pin.hasMe }"
              />
              <circle
                v-for="pin in scaleLayout.players"
                :key="'dot-' + pin.key"
                :cx="pin.pct * 10"
                cy="98"
                r="4"
                class="marker-dot"
                :class="{ 'is-me': pin.hasMe }"
              />

              <path
                v-if="scaleLayout.correct"
                :d="scaleLayout.correct.path"
                class="marker-correct-stem"
              />
              <circle
                v-if="scaleLayout.correct"
                :cx="scaleLayout.correct.pct * 10"
                cy="98"
                r="5"
                class="marker-correct-dot"
              />
            </svg>

            <div
              v-for="pin in scaleLayout.players"
              :key="'pin-' + pin.key"
              class="marker-pin"
              :style="{
                left: pin.badgePct + '%',
                bottom: pin.bottomPct + '%',
              }"
            >
              <div
                v-if="pin.items.length === 1"
                class="marker-badge"
                :class="{ 'is-me': pin.items[0].isMe }"
              >
                {{ pin.items[0].name }} ({{ pin.items[0].estimate?.toLocaleString("ca-ES") }})
              </div>
              <div v-else class="marker-cluster-stack">
                <div
                  v-for="item in pin.items"
                  :key="item.id || item.name"
                  class="marker-badge"
                  :class="{ 'is-me': item.isMe }"
                >
                  {{ item.name }} ({{ item.estimate?.toLocaleString("ca-ES") }})
                </div>
              </div>
            </div>

            <div
              v-if="scaleLayout.correct"
              class="marker-pin marker-correct-pin"
              :style="{
                left: scaleLayout.correct.badgePct + '%',
                bottom: scaleLayout.correct.bottomPct + '%',
              }"
            >
              <div class="marker-correct-badge">
                Resposta: {{ game.respostaCorrecta?.toLocaleString("ca-ES") }}
                {{ game.unitat }}
              </div>
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

.action-slot {
  min-width: 120px;
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
  padding: clamp(16px, 2.5vw, 22px) clamp(16px, 3vw, 28px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pregunta-text {
  font-size: clamp(18px, 2.2vw, 23px);
  color: #ffffff;
  font-weight: 800;
  text-align: center;
}

.correct-pill {
  font-size: clamp(15px, 2vw, 17px);
  color: #5eead4;
  background: #102a27;
  border: 1px solid #14b8a6;
  padding: 6px 18px;
  border-radius: 8px;
  text-align: center;
}

.resposta-main {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-top: clamp(18px, 3vh, 26px);
  gap: clamp(16px, 2.5vw, 24px);
  align-items: flex-end;
}

.scale-section {
  flex: 1 1 65%;
  min-width: 0;
  position: relative;
  padding: 12px 10px 0;
}

.markers-container {
  width: 100%;
  height: clamp(160px, 24vh, 220px);
  position: relative;
}

.markers-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 1;
}

.marker-stem {
  fill: none;
  stroke: #64748b;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.marker-stem.is-me {
  stroke: #14b8a6;
  stroke-width: 2.5;
}

.marker-dot {
  fill: #64748b;
}

.marker-dot.is-me {
  fill: #5eead4;
}

.marker-correct-stem {
  fill: none;
  stroke: #14b8a6;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 4px rgba(20, 184, 166, 0.6));
}

.marker-correct-dot {
  fill: #5eead4;
  filter: drop-shadow(0 0 6px rgba(94, 234, 212, 0.8));
}

.marker-pin {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  z-index: 10;
  pointer-events: auto;
}

.marker-correct-pin {
  z-index: 20;
}

.marker-cluster-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
}

.marker-badge {
  background-color: #181d28;
  border: 1px solid #334155;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  padding: 4px 9px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
}

.marker-badge.is-me {
  background-color: #102a27;
  border-color: #14b8a6;
  color: #5eead4;
  box-shadow: 0 4px 14px rgba(20, 184, 166, 0.3);
}

.marker-correct-badge {
  background-color: #14b8a6;
  color: #0b1116;
  font-size: 13px;
  font-weight: 800;
  border-radius: 6px;
  padding: 5px 12px;
  white-space: nowrap;
  box-shadow: 0 6px 16px rgba(20, 184, 166, 0.45);
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
  font-size: clamp(13px, 1.7vw, 15px);
  color: #94a3b8;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.posicions-card {
  flex: 0 0 300px;
  padding: 16px 18px;
}

.posicions-title {
  font-size: 13px;
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
  min-width: 0;
}

.pos-rank {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pos-pts {
  font-size: 13px;
  font-weight: 800;
  color: #5eead4;
  flex-shrink: 0;
}

@media (min-width: 1440px) and (min-height: 820px) {
  .results-wrapper {
    width: min(1180px, 100%);
  }
  .posicions-card {
    flex: 0 0 330px;
  }
}

@media (max-width: 820px) {
  .resposta-main {
    flex-direction: column;
    align-items: stretch;
  }
  .posicions-card {
    flex: 1 1 auto;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .action-slot {
    min-width: auto;
    width: 100%;
  }
  .btn-next {
    width: 100%;
  }
}
</style>
