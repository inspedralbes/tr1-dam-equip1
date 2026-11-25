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
    }  },
);
</script>

<template>
  <div class="cat-container">
    <div class="cat-box">
      <!-- FASE DE VOTACIÓN -->
      <div v-if="game.fase === 'VOTING_CATEGORY'" class="grid-container">
        <div class="cat-title">Votació de categories</div>
        <div class="cat-subtitle">
          Tria una categoria per a la pròxima ronda
        </div>

        <div class="voted-label">
          Han votat {{ game.votsRebuts }} de {{ game.totalJugadors }} jugadors
        </div>

        <!-- Cuadrícula 2x2 para los botones -->
        <div class="categories-grid hm-escalonat">
          <button
            v-for="(c, i) in game.categories"
            :key="c"
            class="cat-btn"
            :class="{
              'btn-voted': categoriaVotada === c,
            }"
            :style="{ '--i': i }"
            :disabled="categoriaVotada !== '' && categoriaVotada !== c"
            @click="votar(c)"
          >
            {{ c }}
          </button>
        </div>

        <!-- Lista de votos en tiempo real -->
        <div class="vots-list" v-if="game.vots && game.vots.length > 0">
          <TransitionGroup name="llista">
            <div v-for="v in game.vots" :key="v.id" class="vot-item">
              <span>{{ v.nom }}</span
              >: <b>{{ v.categoria }}</b>
            </div>
          </TransitionGroup>
        </div>

        <button
          v-if="room.esHost"
          class="cat-btn action-btn mt-4"
          @click="tancarVotacio"
        >
          Tancar votació
        </button>
      </div>

      <!-- FASE DE CATEGORÍA ELEGIDA -->
      <div v-else-if="game.fase === 'CATEGORY_CHOSEN'" class="grid-container hm-entrada">
        <div class="cat-title">Resultats de la votació</div>

        <div class="winner-label hm-pop" style="animation-delay: 0.15s">
          Categoria triada: {{ game.categoriaGuanyadora }}
        </div>

        <div class="grid-container hm-escalonat">
          <div
            v-for="(n, categoria, i) in game.recompte"
            :key="categoria"
            class="result-row"
            :style="{ '--i': i + 2 }"
          >
            <span>{{ categoria }}</span>
            <span class="badge-vots">{{ n }} vots</span>
          </div>
        </div>

        <button
          v-if="room.esHost"
          class="cat-btn action-btn mt-4"
          @click="comencarRonda"
        >
          Començar ronda
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  flex-grow: 1;
  background-color: transparent;
}

.cat-container {
  display: flex;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  padding: 30px;
  min-height: 100vh;
  background-color: transparent;
  box-sizing: border-box;
}

.cat-box {
  width: 860px;
  max-width: 100%;
  background-color: #242834;
  border-radius: 12px;
  padding: 30px;
  border: 1px solid #333a4a;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cat-title {
  font-size: 28px;
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 6px;
  text-align: center;
}

.cat-subtitle {
  font-size: 15px;
  color: #94a3b8;
  margin-bottom: 10px;
  text-align: center;
}

.voted-label {
  font-size: 14px;
  color: #94a3b8;
  background-color: #1d212b;
  border: 1px solid #333a4a;
  padding: 6px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: bold;
}

.winner-label {
  font-size: 18px;
  color: #00bfa5;
  background-color: #142926;
  border: 1px solid #00bfa5;
  padding: 8px 24px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: bold;
  text-align: center;
}

.grid-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Nueva clase para organizar las categorías en 2 columnas (2 arriba, 2 abajo) */
.categories-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 10px;
}

.cat-btn {
  width: 100%;
  height: 90px;
  margin: 0;
  background-color: #1d212b;
  color: #ffffff;
  font-size: 19px;
  font-weight: bold;
  border-radius: 10px;
  border: 1px solid #333a4a;
  white-space: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

/* En passar el ratolí, una vora turquesa suau */
.cat-btn:hover:not(:disabled):not(.btn-voted) {
  box-shadow: 0 0 0 3px rgba(0, 191, 165, 0.12);
}

.cat-btn:hover:not(:disabled) {
  background-color: #282e3d;
  border-color: #475569;
}

.cat-btn:active:not(:disabled) {
  background-color: #151820;
}

.cat-btn:disabled {
  /* !important porque l'animació d'entrada deixa l'opacitat a 1 */
  opacity: 0.6 !important;
  cursor: not-allowed;
}

.btn-voted {
  background-color: #1e293b !important;
  border-color: #38bdf8 !important;
  color: #38bdf8 !important;
  border-width: 2px;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.25);
  animation: hm-pop 0.4s ease both;
}

.action-btn {
  width: 100%;
  height: 60px;
  background-color: #00bfa5;
  color: #ffffff;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  margin-top: 15px;
}
.action-btn:hover {
  background-color: #009d88;
}

.vots-list,
.result-row {
  width: 100%;
  color: #94a3b8;
  margin-top: 15px;
  background: #1d212b;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid #333a4a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-vots {
  color: #ffffff;
  background: #333a4a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}
</style>
