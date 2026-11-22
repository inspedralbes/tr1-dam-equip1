<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { usePlayerStore } from "@/stores/player";
import { useRoomStore } from "@/stores/room";

const player = usePlayerStore();
const room = useRoomStore();

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();

const copiat = ref(false);

const esHost = computed(() => room.esHost);

async function copiarCodi() {
  try {
    await navigator.clipboard.writeText(room.codi);
    copiat.value = true;
    setTimeout(() => {
      copiat.value = false;
    }, 2000);
  } catch (e) {
    console.error("No s'ha pogut copiar el codi", e);
  }
}

function iniciarPartida() {
  connexio.enviar({ type: "startCategoryVote" });
}

async function sortir() {
  connexio.desconnectar()
  await router.push({ name: 'home' })
  game.reiniciar()
  room.sortir()
}

watch(
  () => game.fase,
  (fase) => {
    if (fase === "VOTING_CATEGORY") {
      router.push({ name: "categories" });
    }
  },
);
</script>

<template>
  <v-container class="lobby-page">
    <v-card class="lobby-card" flat>
      <div class="header-row">
        <div class="header-left">
          <div class="lobby-title">Sala d'espera</div>
          <div class="code-label">{{ room.codi }}</div>

          <v-btn v-if="room.codi" class="copy-btn" variant="text" size="small" @click="copiarCodi"
            :color="copiat ? 'success' : 'primary'">
            {{ copiat ? "Copiat" : "Copiar codi" }}
          </v-btn>
        </div>

        <v-btn v-if="esHost" class="btn-start" color="primary" @click="iniciarPartida">
          Iniciar partida
        </v-btn>
      </div>

      <div class="participants-title">
        Participants: {{ room.nombreParticipants }}
      </div>

      <v-list class="players-scroll" density="comfortable">
        <v-list-item v-for="p in room.participants" :key="p.nom" class="player-item" :title="p.nom"
          :subtitle="p.esHost ? 'Amfitrió' : undefined" />
      </v-list>

      <v-btn @click="sortir">Sortir</v-btn>
    </v-card>
  </v-container>
</template>

<style scoped>
:deep(body),
:deep(.v-application) {
  background: #181b22 !important;
}

.lobby-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #181b22;
  padding: 30px;
}

.lobby-card {
  width: min(860px, 100%);
  min-height: 580px;
  background: #242834 !important;
  border: 1px solid #333a4a;
  border-radius: 12px;
  padding: 25px 30px;
  box-shadow: none;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #333a4a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lobby-title {
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
}

.code-label {
  font-size: 20px;
  font-weight: 700;
  color: #00bfa5;
  background: #142926;
  border: 1px solid #00bfa5;
  border-radius: 6px;
  padding: 6px 16px;
}

.copy-btn {
  min-width: auto;
  height: 36px !important;
  font-size: 13px !important;
  padding: 0 12px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(0, 191, 165, 0.5) !important;
  background: rgba(0, 191, 165, 0.08) !important;
  color: #7ee7d5 !important;
}

.copy-btn:hover {
  background: rgba(0, 191, 165, 0.16) !important;
}

.btn-start {
  height: 44px !important;
  padding-left: 24px !important;
  padding-right: 24px !important;
  background: #00bfa5 !important;
  color: #ffffff !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

.btn-start:hover {
  background: #00a892 !important;
}

.participants-title {
  margin-bottom: 12px;
  font-size: 17px;
  font-weight: 700;
  color: #94a3b8;
}

.players-scroll {
  flex: 1;
  background: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 8px;
  padding: 16px;
}

.player-item {
  border-radius: 8px;
  margin: 6px 0;
  background: transparent;
}

:deep(.player-item .v-list-item__content) {
  color: #ffffff;
}

:deep(.player-item .v-list-item-title) {
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
}

:deep(.player-item .v-list-item-subtitle) {
  color: #94a3b8;
}

:deep(.v-list-item:hover) {
  background: rgba(255, 255, 255, 0.02);
}
</style>
