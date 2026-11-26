<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { useRoomStore } from "@/stores/room";
import { usePlayerStore } from "@/stores/player";
import AvatarBadge from "@/components/AvatarBadge.vue";
import ConfettiCanvas from "@/components/ConfettiCanvas.vue";

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();
const room = useRoomStore();
const player = usePlayerStore();

const enviat = ref(false);

function tornarAJugar() {
  if (enviat.value) return;
  enviat.value = true;
  connexio.enviar({ type: "restartGame" });
}

async function sortir() {
  connexio.enviar({ type: "leaveRoom" });
  connexio.desconnectar();
  game.reiniciar();
  room.sortir();
  await router.replace({ name: "home" });
}

const r1 = computed(() => game.classificacioFinal?.[0] || null);
const r2 = computed(() => game.classificacioFinal?.[1] || null);
const r3 = computed(() => game.classificacioFinal?.[2] || null);
const rBelow = computed(() => (game.classificacioFinal || []).slice(3));

const bannerPersonal = computed(() => {
  const list = game.classificacioFinal || [];
  const idx = list.findIndex((p) => p.name === player.nom);
  if (idx >= 0) {
    return `${player.nom}, has quedat en posició ${idx + 1} amb ${list[idx].score} punts.`;
  }
  return "Partida finalitzada.";
});

watch(
  () => game.fase,
  (fase) => {
    if (fase === "LOBBY") {
      router.replace({ name: "sala-espera" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <ConfettiCanvas />

    <div class="final-wrapper panel-enter">
      <div class="top-bar">
        <div class="player-pill">
          <AvatarBadge :avatar-id="player.avatar" :size="34" />
          <span class="nom-header">{{ player.nom }}</span>
        </div>

        <div class="final-title-badge">Classificació final</div>

        <div class="header-actions">
          <v-btn
            v-if="room.esHost"
            class="btn-next"
            :disabled="enviat"
            @click="tornarAJugar"
          >
            Nova partida
          </v-btn>
          <v-btn class="btn-exit" variant="outlined" @click="sortir">Sortir</v-btn>
        </div>
      </div>

      <div class="podium-area">
        <div class="podium-row">
          <div class="podium-column" v-if="r2">
            <AvatarBadge :avatar-id="r2.avatar ?? 0" :size="54" />
            <div class="podium-name">{{ r2.name }}</div>
            <div class="podium-score silver">{{ r2.score }} pts</div>
            <div class="podium-block podium-2">
              <span class="podium-number">2</span>
            </div>
          </div>

          <div class="podium-column" v-if="r1">
            <svg viewBox="0 0 36 22" class="winner-crown" fill="none">
              <path
                d="M3 19L6 6L13 13L18 3L23 13L30 6L33 19H3Z"
                fill="#f59e0b"
                stroke="#fde68a"
                stroke-width="2"
                stroke-linejoin="round"
              />
            </svg>
            <AvatarBadge :avatar-id="r1.avatar ?? 0" :size="62" />
            <div class="podium-name is-first">{{ r1.name }}</div>
            <div class="podium-score gold">{{ r1.score }} pts</div>
            <div class="podium-block podium-1">
              <span class="podium-number">1</span>
            </div>
          </div>

          <div class="podium-column" v-if="r3">
            <AvatarBadge :avatar-id="r3.avatar ?? 0" :size="50" />
            <div class="podium-name">{{ r3.name }}</div>
            <div class="podium-score bronze">{{ r3.score }} pts</div>
            <div class="podium-block podium-3">
              <span class="podium-number">3</span>
            </div>
          </div>
        </div>

        <div v-if="rBelow.length > 0" class="podium-below-row">
          <div
            v-for="(j, idx) in rBelow"
            :key="j.name"
            class="rank-below-box"
          >
            <AvatarBadge :avatar-id="j.avatar ?? 0" :size="26" />
            <span class="rank-below-text">
              {{ idx + 4 }}. {{ j.name }} ({{ j.score }} pts)
            </span>
          </div>
        </div>
      </div>

      <div class="puntuacio-usuari-card">
        <span class="puntuacio-usuari-text">{{ bannerPersonal }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.final-wrapper {
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
  flex-wrap: wrap;
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

.final-title-badge {
  font-size: 13px;
  color: #fde68a;
  background-color: #2c2008;
  border: 1px solid #d97706;
  border-radius: 999px;
  padding: 5px 16px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-next {
  background-color: #14b8a6 !important;
  color: #0b1116 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  height: 40px !important;
  box-shadow: none !important;
}

.btn-next:hover {
  background-color: #0d9488 !important;
  color: #ffffff !important;
}

.btn-exit {
  color: #cbd5e1 !important;
  border-color: #334155 !important;
  text-transform: none !important;
  font-weight: 700 !important;
  height: 40px !important;
  border-radius: 8px !important;
}

.podium-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.podium-row {
  width: 100%;
  max-width: 580px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: clamp(8px, 2vw, 18px);
  min-height: clamp(230px, 38vh, 330px);
}

.podium-column {
  flex: 1 1 0;
  min-width: 0;
  max-width: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.winner-crown {
  width: 32px;
  height: 20px;
  margin-bottom: 6px;
}

.podium-name {
  font-size: clamp(13px, 2vw, 16px);
  color: #f8fafc;
  font-weight: 700;
  margin-top: 6px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.podium-name.is-first {
  font-size: clamp(15px, 2.2vw, 18px);
  color: #ffffff;
}

.podium-score {
  font-size: clamp(12px, 1.8vw, 14px);
  font-weight: 800;
  margin-bottom: 8px;
}

.podium-score.gold {
  color: #fbbf24;
}

.podium-score.silver {
  color: #cbd5e1;
}

.podium-score.bronze {
  color: #fdba74;
}

@keyframes riseBlock {
  from {
    transform: scaleY(0.15);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

.podium-block {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  transform-origin: bottom center;
  animation: riseBlock 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.podium-1 {
  height: clamp(120px, 22vh, 205px);
  background-color: #92400e;
  border: 1px solid #f59e0b;
  border-top: 5px solid #fbbf24;
  box-shadow: 0 12px 32px rgba(245, 158, 11, 0.25);
}

.podium-2 {
  height: clamp(88px, 15vh, 145px);
  background-color: #1e293b;
  border: 1px solid #64748b;
  border-top: 5px solid #cbd5e1;
}

.podium-3 {
  height: clamp(64px, 11vh, 102px);
  background-color: #431407;
  border: 1px solid #b45309;
  border-top: 5px solid #f97316;
}

.podium-number {
  font-size: clamp(28px, 5vw, 44px);
  color: #ffffff;
  font-weight: 900;
}

.podium-below-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.rank-below-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background-color: #181d28;
  border: 1px solid #2a3346;
  border-radius: 8px;
  padding: 8px 14px;
}

.rank-below-text {
  font-size: 14px;
  color: #cbd5e1;
  font-weight: 700;
}

.puntuacio-usuari-card {
  width: min(720px, 100%);
  background-color: #102a27;
  border: 2px solid #14b8a6;
  border-radius: 10px;
  margin-top: clamp(16px, 3vh, 26px);
  padding: 12px 20px;
  text-align: center;
}

.puntuacio-usuari-text {
  font-size: clamp(15px, 2vw, 18px);
  color: #a7f3d0;
  font-weight: 800;
}

@media (min-width: 1440px) and (min-height: 820px) {
  .final-wrapper {
    width: min(1100px, 100%);
  }
  .podium-row {
    max-width: 640px;
  }
}

@media (max-width: 600px) {
  .header-actions {
    width: 100%;
  }
  .header-actions > button,
  .header-actions > .v-btn {
    flex: 1 1 0;
  }
}
</style>
