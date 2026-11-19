<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();

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
      router.push({ name: "resultats-ronda" });
    }
  },
);
</script>

<template>
  <div class="pregunta-root d-flex flex-column">
    <v-container class="panel d-flex flex-column pa-0">
      <!-- TOP HEADER / BADGE DE RONDA -->
      <div class="ronda-badge">
        Ronda {{ game.ronda }} de {{ game.totalRondes }}
      </div>

      <!-- TIMER BOX -->
      <div v-if="game.segonsRestants !== null" class="timer-box">
        <span class="timer-text"
          >Temps restant: {{ game.segonsRestants }} s</span
        >
      </div>

      <!-- PREGUNTA CARD -->
      <div class="pregunta-card elevation-0">
        <div class="pregunta-text">{{ game.pregunta }}</div>
      </div>

      <!-- SLIDER / CONTROLES DE RESPUESTA -->
      <div v-if="hiHaRang" class="slider-box d-flex flex-column">
        <div class="slider-row">
          <span class="val-label-min">{{
            game.minim?.toLocaleString("ca-ES")
          }}</span>
          <v-slider
            v-model="valor"
            :min="game.minim"
            :max="game.maxim"
            :step="1"
            :disabled="enviada"
            hide-details
            class="pregunta-slider"
          />
          <span class="val-label-max">{{
            game.maxim?.toLocaleString("ca-ES")
          }}</span>
        </div>

        <div class="estimacio-label">
          La teva resposta: {{ valor.toLocaleString("ca-ES") }}
          {{ game.unitat }}
        </div>

        <v-btn
          class="btn-submit"
          :disabled="enviada"
          @click="enviarResposta"
          flat
        >
          {{ enviada ? "Resposta enviada" : "Enviar resposta" }}
        </v-btn>
      </div>

      <div v-else class="text-center mt-6">
        <p class="text-white">
          El servidor no ha enviat el rang de la pregunta.
        </p>
      </div>

      <!-- LISTA DE JUGADORES QUE HAN RESPONDIDO -->
      <div class="posicions-card align-self-center mt-8">
        <div class="posicions-title">
          Han respost {{ game.respostes.length }} de {{ game.totalJugadors }}
        </div>
        <v-list bg-color="transparent" class="pa-0">
          <v-list-item
            v-for="r in game.respostes"
            :key="r.id"
            :title="r.nom"
            class="posicio-item pa-0"
          />
        </v-list>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
:root {
  flex-grow: 1;
  background-color: #181b22;
}

.pregunta-root {
  flex-grow: 1;
  background-color: #181b22;
  padding: 15px 25px;
  min-height: 100vh;
}

/* TOP HEADER */
.top-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 50px;
  padding-left: 10px;
  padding-right: 10px;
  margin-bottom: 6px;
}

.nom-header {
  font-size: 22px;
  color: #ffffff;
  font-weight: bold;
}

.btn-next {
  background-color: #00bfa5;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  padding-left: 22px;
  padding-right: 22px;
  height: 42px;
  border: none;
}

.btn-next:hover {
  background-color: #00a892;
}

.panel {
  flex-grow: 1;
  width: 100%;
}

/* PREGUNTA PANEL */
.ronda-badge {
  font-size: 14px;
  color: #94a3b8;
  background-color: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 6px;
  padding: 4px 14px;
  align-self: center;
  margin-top: 2px;
  margin-bottom: 8px;
  font-weight: bold;
}

.pregunta-card {
  width: 88%;
  min-height: 90px;
  background-color: #242834;
  border-radius: 12px;
  border: 1px solid #333a4a;
  align-self: center;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px 28px;
}

.pregunta-text {
  font-size: 24px;
  color: #ffffff;
  font-weight: bold;
  text-align: center;
  white-space: normal;
}

.correct-text {
  font-size: 19px;
  color: #00bfa5;
  font-weight: bold;
  text-align: center;
  margin-top: 8px;
}

.timer-box {
  align-self: flex-end;
  margin-right: 6%;
  margin-top: 10px;
  min-height: 25px;
}

.timer-text {
  font-size: 17px;
  color: #f43f5e;
  background-color: #2b1d24;
  border: 1px solid #f43f5e;
  padding: 4px 14px;
  border-radius: 6px;
  font-weight: bold;
}

.slider-box {
  width: 80%;
  align-self: center;
  margin-top: 35px;
  align-items: center;
}

.slider-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.val-label-min,
.val-label-max {
  font-size: 20px;
  color: #94a3b8;
  font-weight: bold;
  margin-left: 18px;
  margin-right: 18px;
}

.pregunta-slider {
  width: 540px;
}

.estimacio-label {
  font-size: 22px;
  color: #ffffff;
  background-color: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 8px;
  padding: 8px 24px;
  font-weight: bold;
  margin-top: 20px;
  text-align: center;
}

.btn-submit {
  min-width: 190px;
  height: 46px !important;
  padding-left: 24px;
  padding-right: 24px;
  background-color: #00bfa5 !important;
  color: #ffffff !important;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  margin-top: 18px;
  box-shadow: none !important;
}

.btn-submit:hover {
  background-color: #00a892 !important;
}

/* RESPOSTA PANEL & SCALE */
.posicions-card {
  width: 400px;
  background-color: #242834;
  border-radius: 12px;
  border: 1px solid #333a4a;
  padding: 16px 20px;
}

.posicions-title {
  font-size: 16px;
  color: #ffffff;
  font-weight: bold;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #333a4a;
}

.posicio-item {
  font-size: 15px;
  color: #cbd5e1;
  font-weight: bold;
  margin-bottom: 4px;
}
</style>
