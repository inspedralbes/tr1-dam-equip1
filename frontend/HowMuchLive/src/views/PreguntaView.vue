<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import { useGameStore } from "@/stores/game";

const router = useRouter();
const connexio = useConnectionStore();
const game = useGameStore();

const hiHaRang = game.minim !== null && game.maxim !== null;
const valor = ref(hiHaRang ? Math.round((game.minim + game.maxim) / 2) : 0);
const enviada = ref(false);

// Barra de temps: percentatge que queda
const percentTemps = computed(() => {
  if (game.segonsRestants === null || !game.segonsTotals) return 100;
  return (game.segonsRestants / game.segonsTotals) * 100;
});

// Últims 5 segons: la barra es posa vermella i el text batega
const pocTemps = computed(
  () => game.segonsRestants !== null && game.segonsRestants <= 5,
);

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
      <div class="ronda-badge hm-entrada">
        Ronda {{ game.ronda }} de {{ game.totalRondes }}
      </div>

      <!-- TIMER BOX -->
      <div v-if="game.segonsRestants !== null" class="timer-box">
        <span class="timer-text" :class="{ urgent: pocTemps }"
          >Temps restant: {{ game.segonsRestants }} s</span
        >
      </div>

      <!-- Barra de temps que es va buidant -->
      <div v-if="game.segonsRestants !== null" class="temps-barra">
        <div
          class="temps-omplert"
          :class="{ urgent: pocTemps }"
          :style="{ width: percentTemps + '%' }"
        ></div>
      </div>

      <!-- PREGUNTA CARD (key = ronda perquè es torni a animar a cada pregunta) -->
      <div :key="game.ronda" class="pregunta-card elevation-0 entrada-pregunta">
        <div class="pregunta-text">{{ game.pregunta }}</div>
      </div>

      <!-- SLIDER / CONTROLES DE RESPUESTA -->
      <div
        v-if="hiHaRang"
        class="slider-box d-flex flex-column hm-entrada"
        style="animation-delay: 0.25s"
      >
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
            color="primary"
            class="pregunta-slider"
          />
          <span class="val-label-max">{{
            game.maxim?.toLocaleString("ca-ES")
          }}</span>
        </div>

        <div class="estimacio-label" :class="{ fixada: enviada }">
          La teva resposta: {{ valor.toLocaleString("ca-ES") }}
          {{ game.unitat }}
        </div>

        <v-btn
          class="btn-submit"
          :class="{ enviada }"
          :disabled="enviada"
          @click="enviarResposta"
          flat
        >
          <span v-if="enviada" class="check">✓</span>
          {{ enviada ? "Resposta enviada" : "Enviar resposta" }}
        </v-btn>
      </div>

      <div v-else class="text-center mt-6">
        <p class="text-white">
          El servidor no ha enviat el rang de la pregunta.
        </p>
      </div>

      <!-- LISTA DE JUGADORES QUE HAN RESPONDIDO -->
      <div
        class="posicions-card align-self-center mt-8 hm-entrada"
        style="animation-delay: 0.4s"
      >
        <div class="posicions-title">
          Han respost {{ game.respostes.length }} de {{ game.totalJugadors }}
        </div>
        <v-list bg-color="transparent" class="pa-0">
          <TransitionGroup name="llista">
            <v-list-item
              v-for="r in game.respostes"
              :key="r.id"
              :title="r.nom"
              class="posicio-item pa-0"
            />
          </TransitionGroup>
        </v-list>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
:root {
  flex-grow: 1;
  background-color: transparent;
}

.pregunta-root {
  flex-grow: 1;
  background-color: transparent;
  padding: 15px 25px;
  min-height: 100vh;
  justify-content: center;
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
  flex-grow: 0;
  max-width: 960px;
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

/* ---------- Animacions ---------- */

/* La pregunta entra fent zoom suau des del centre */
.entrada-pregunta {
  animation: pregunta-entra 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
  animation-delay: 0.1s;
}

@keyframes pregunta-entra {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

/* Barra de temps */
.temps-barra {
  width: 88%;
  height: 4px;
  align-self: center;
  margin: 10px 0 12px;
  background: #1d212b;
  border-radius: 4px;
  overflow: hidden;
}

.temps-omplert {
  height: 100%;
  background: #00bfa5;
  border-radius: 4px;
  transition: width 1s linear, background-color 0.3s ease;
}

.temps-omplert.urgent {
  background: #f43f5e;
}

.timer-text {
  display: inline-block;
  transition: background-color 0.3s ease;
}

.timer-text.urgent {
  animation: hm-batec 1s ease-in-out infinite;
  background-color: #3a1d27;
}

/* La resposta queda "fixada" quan l'envies */
.estimacio-label {
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.estimacio-label.fixada {
  border-color: #00bfa5;
  box-shadow: 0 0 0 3px rgba(0, 191, 165, 0.15);
}

/* Botó d'enviar: quan s'ha enviat fa un petit "pop" */
.btn-submit.enviada {
  animation: hm-pop 0.4s ease;
  opacity: 1 !important;
  background-color: #10b981 !important;
}

.check {
  display: inline-block;
  margin-right: 6px;
  animation: hm-pop 0.4s ease 0.1s both;
}
</style>
