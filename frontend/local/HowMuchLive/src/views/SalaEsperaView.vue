<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { useRoomStore } from "@/stores/room";
import AvatarBadge from "@/components/AvatarBadge.vue";

const room = useRoomStore();
const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();

const copiat = ref(false);
const esHost = computed(() => room.esHost);

async function copiarCodi() {
  const text = String(room.codi || "").trim();
  if (!text) return;

  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch (e) {
    ok = false;
  }

  if (!ok) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {
      ok = false;
    }
  }

  if (ok) {
    copiat.value = true;
    setTimeout(() => {
      copiat.value = false;
    }, 2000);
  }
}

function iniciarPartida() {
  connexio.enviar({ type: "startCategoryVote" });
}

async function sortir() {
  connexio.desconnectar();
  await router.push({ name: "home" });
  game.reiniciar();
  room.sortir();
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
  <div class="studio-backdrop">
    <div class="studio-card lobby-box panel-enter">
      <div class="header-row">
        <div class="header-left">
          <div class="lobby-title">Sala d'espera</div>
          <div class="code-label">Sala: {{ room.codi }}</div>
          <button
            v-if="room.codi"
            type="button"
            class="copy-btn"
            :class="{ 'is-copied': copiat }"
            @click="copiarCodi"
          >
            {{ copiat ? "Copiat" : "Copiar codi" }}
          </button>
        </div>

        <v-btn v-if="esHost" class="btn-start" @click="iniciarPartida">
          Començar partida
        </v-btn>
      </div>

      <div class="participants-title">
        Participants connectats: {{ room.nombreParticipants }}
      </div>

      <div class="players-scroll">
        <div class="players-wrap-container">
          <div
            v-for="p in room.participants"
            :key="p.nom"
            class="player-chip"
            :class="{ 'is-host': p.esHost }"
          >
            <AvatarBadge :avatar-id="p.avatar" :size="34" />
            <span class="player-name">{{ p.nom }}</span>
            <span v-if="p.esHost" class="host-tag">HOST</span>
          </div>
        </div>
      </div>

      <div class="footer-row">
        <v-btn class="btn-exit" variant="text" @click="sortir">Sortir de la sala</v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-box {
  width: min(860px, 100%);
  min-height: 540px;
  padding: 26px 30px;
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #2a3346;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.lobby-title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
}

.code-label {
  font-size: 19px;
  font-weight: 800;
  color: #5eead4;
  background: #102a27;
  border: 1px solid #14b8a6;
  border-radius: 8px;
  padding: 6px 16px;
  letter-spacing: 0.5px;
}

.copy-btn {
  height: 36px;
  font-size: 13px;
  font-weight: 700;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(20, 184, 166, 0.45);
  background: rgba(20, 184, 166, 0.1);
  color: #5eead4;
  cursor: pointer;
  transition: background-color 0.15s;
}

.copy-btn:hover {
  background: rgba(20, 184, 166, 0.2);
}

.copy-btn.is-copied {
  border-color: #34d399;
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.16);
}

.btn-start {
  height: 44px !important;
  padding: 0 24px !important;
  background: #14b8a6 !important;
  color: #0b1116 !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  box-shadow: none !important;
}

.btn-start:hover {
  background: #0d9488 !important;
  color: #ffffff !important;
}

.participants-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.players-scroll {
  flex: 1;
  background: #121620;
  border: 1px solid #252d3e;
  border-radius: 10px;
  padding: 18px;
  overflow-y: auto;
}

.players-wrap-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.player-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #1d2433;
  border: 1px solid #2f3a50;
  border-radius: 10px;
  padding: 9px 16px;
  transition: transform 0.15s, border-color 0.15s;
}

.player-chip:hover {
  transform: translateY(-1px);
  border-color: #475569;
}

.player-chip.is-host {
  border-color: rgba(20, 184, 166, 0.55);
}

.player-name {
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.host-tag {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #5eead4;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(20, 184, 166, 0.45);
  padding: 2px 7px;
  border-radius: 5px;
}

.footer-row {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.btn-exit {
  color: #94a3b8 !important;
  text-transform: none !important;
  font-weight: 600 !important;
}

.btn-exit:hover {
  color: #fb7185 !important;
}
</style>
