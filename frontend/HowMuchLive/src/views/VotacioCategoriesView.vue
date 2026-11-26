<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";
import { useRoomStore } from "@/stores/room";

const connexio = useConnectionStore();
const game = useGameStore();
const room = useRoomStore();

const categoriaVotada = ref("");

function votar(categoria) {
  if (categoriaVotada.value !== "") return;
  categoriaVotada.value = categoria;
  connexio.enviar({ type: "voteCategory", category: categoria });
}

function tancarVotacio() {
  connexio.enviar({ type: "endCategoryVote" });
}

function comencarRonda() {
  connexio.enviar({ type: "startRound" });
}

const router = useRouter();

watch(
  () => game.fase,
  (fase) => {
    if (fase === "QUESTION") {
      router.push({ name: "pregunta" });
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="studio-card cat-box panel-enter">
      <!-- FASE DE VOTACIÓ -->
      <div v-if="game.fase === 'VOTING_CATEGORY'" class="grid-container">
        <div class="cat-title">Escull Categoria</div>
        <div class="cat-subtitle">
          Vota quina categoria vols jugar aquesta ronda
        </div>

        <div class="voted-label">
          Vots: {{ game.votsRebuts }} / {{ game.totalJugadors }}
        </div>

        <div class="categories-grid">
          <button
            v-for="c in game.categories"
            :key="c"
            class="cat-btn"
            :class="{ 'btn-voted': categoriaVotada === c }"
            :disabled="categoriaVotada !== '' && categoriaVotada !== c"
            @click="votar(c)"
          >
            {{ c }}
          </button>
        </div>

        <div class="vots-list" v-if="game.vots && game.vots.length > 0">
          <div v-for="v in game.vots" :key="v.id" class="vot-chip">
            <span class="vot-nom">{{ v.nom }}</span>
            <span class="vot-cat">{{ v.categoria }}</span>
          </div>
        </div>

        <button
          v-if="room.esHost"
          class="action-btn"
          @click="tancarVotacio"
        >
          Tancar votació
        </button>
      </div>

      <!-- FASE DE CATEGORIA TRIADA -->
      <div v-else-if="game.fase === 'CATEGORY_CHOSEN'" class="grid-container">
        <div class="cat-title">Votació finalitzada</div>

        <div class="winner-label">
          Categoria triada: {{ game.categoriaGuanyadora }}
        </div>

        <div class="results-list">
          <div
            v-for="(n, categoria) in game.recompte"
            :key="categoria"
            class="result-row"
            :class="{ 'is-winner': categoria === game.categoriaGuanyadora }"
          >
            <span class="result-cat">{{ categoria }}</span>
            <span class="badge-vots">{{ n }} vots</span>
          </div>
        </div>

        <button
          v-if="room.esHost"
          class="action-btn"
          @click="comencarRonda"
        >
          Començar ronda
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-box {
  width: min(860px, 100%);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cat-title {
  font-size: 28px;
  color: #ffffff;
  font-weight: 800;
  margin-bottom: 6px;
  text-align: center;
}

.cat-subtitle {
  font-size: 15px;
  color: #94a3b8;
  margin-bottom: 14px;
  text-align: center;
}

.voted-label {
  font-size: 13px;
  color: #94a3b8;
  background-color: #121620;
  border: 1px solid #2a3346;
  padding: 6px 18px;
  border-radius: 999px;
  margin-bottom: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.winner-label {
  font-size: 19px;
  color: #5eead4;
  background-color: #102a27;
  border: 1px solid #14b8a6;
  padding: 10px 26px;
  border-radius: 8px;
  margin: 12px 0 18px;
  font-weight: 800;
  text-align: center;
}

.categories-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.cat-btn {
  width: 100%;
  height: 106px;
  background-color: #121620;
  color: #ffffff;
  font-size: 19px;
  font-weight: 700;
  border-radius: 10px;
  border: 1px solid #2a3346;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.14s ease, background-color 0.16s, border-color 0.16s;
}

.cat-btn:hover:not(:disabled) {
  background-color: #1d2433;
  border-color: #475569;
  transform: translateY(-2px);
}

.cat-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-voted {
  background-color: #132536 !important;
  border: 2px solid #38bdf8 !important;
  color: #7dd3fc !important;
  opacity: 1 !important;
}

.vots-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.vot-chip {
  background: #121620;
  border: 1px solid #2a3346;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: #cbd5e1;
  display: inline-flex;
  gap: 8px;
}

.vot-cat {
  color: #38bdf8;
  font-weight: 700;
}

.results-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-row {
  width: 100%;
  color: #cbd5e1;
  background: #121620;
  padding: 12px 18px;
  border-radius: 8px;
  border: 1px solid #2a3346;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}

.result-row.is-winner {
  background: #102a27;
  border-color: #14b8a6;
  color: #ffffff;
}

.badge-vots {
  color: #ffffff;
  background: #262e3f;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.action-btn {
  width: 100%;
  height: 48px;
  background-color: #14b8a6;
  color: #0b1116;
  font-size: 16px;
  font-weight: 800;
  border-radius: 8px;
  border: none;
  margin-top: 18px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: #0d9488;
  color: #ffffff;
}
</style>
