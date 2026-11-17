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
  <div class="pregunta-root">
    <!-- TOP HEADER -->
    <div class="top-bar">
      <div class="nom-header">
        Ronda {{ game.ronda }} de {{ game.totalRondes }}
      </div>

      <!-- Opcional: Botón siguiente o estado de respuestas -->
      <div class="timer-box" v-if="game.segonsRestants !== null">
        <span class="timer-text">{{ game.segonsRestants }}s</span>
      </div>
    </div>

    <!-- PANEL PRINCIPAL -->
    <div class="panel">
      <!-- Badge de ronda / estado -->
      <div class="ronda-badge">
        Han respost {{ game.respostes?.length || 0 }} de
        {{ game.totalJugadors }} jugadors
      </div>

      <!-- Tarjeta de la pregunta -->
      <div class="pregunta-card">
        <div class="pregunta-text">{{ game.pregunta }}</div>
      </div>

      <!-- SLIDER DE RESPUESTA -->
      <div v-if="hiHaRang" class="slider-box">
        <!-- Valor estimado seleccionado -->
        <div class="estimacio-label">
          {{ valor.toLocaleString("ca-ES") }} {{ game.unitat || "" }}
        </div>

        <div class="slider-row" style="margin-top: 20px; width: 100%">
          <span class="val-label-min">{{
            game.minim.toLocaleString("ca-ES")
          }}</span>

          <input
            type="range"
            v-model.number="valor"
            :min="game.minim"
            :max="game.maxim"
            :step="1"
            :disabled="enviada"
            class="pregunta-slider-input"
          />

          <span class="val-label-max">{{
            game.maxim.toLocaleString("ca-ES")
          }}</span>
        </div>

        <!-- Botón Enviar -->
        <button class="btn-submit" :disabled="enviada" @click="enviarResposta">
          {{ enviada ? "Resposta enviada" : "Enviar resposta" }}
        </button>
      </div>

      <div v-else class="pregunta-card" style="margin-top: 20px">
        <div class="pregunta-text" style="font-size: 18px; color: #f43f5e">
          El servidor no ha enviat el rang de la pregunta.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  flex-grow: 1;
  background-color: #181b22;
}

.pregunta-root {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 100vh;
  background-color: #181b22;
  padding: 25px;
  box-sizing: border-box;
  align-items: center;
}

/* TOP HEADER */
.top-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 880px;
  height: 50px;
  padding: 0 10px;
  margin-bottom: 6px;
}

.nom-header {
  font-size: 22px;
  color: #ffffff;
  font-weight: bold;
}

.panel {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
  max-width: 880px;
  align-items: center;
}

/* PREGUNTA PANEL */
.ronda-badge {
  font-size: 14px;
  color: #94a3b8;
  background-color: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 6px;
  padding: 4px 14px;
  margin-top: 2px;
  margin-bottom: 16px;
  font-weight: bold;
}

.pregunta-card {
  width: 100%;
  min-height: 90px;
  background-color: #242834;
  border-radius: 12px;
  border: 1px solid #333a4a;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px 28px;
  box-sizing: border-box;
  text-align: center;
}

.pregunta-text {
  font-size: 24px;
  color: #ffffff;
  font-weight: bold;
  line-height: 1.4;
}

.timer-box {
  margin-top: 0;
}

.timer-text {
  font-size: 17px;
  color: #f43f5e;
  background-color: #2b1d24;
  border: 1px solid #f43f5e;
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: bold;
}

.slider-box {
  width: 100%;
  display: flex;
  flex-direction: column;
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
  margin: 0 18px;
}

/* Estilo web adaptado para el slider nativo */
.pregunta-slider-input {
  width: 100%;
  max-width: 540px;
  height: 16px;
  background: #1d212b;
  border-radius: 8px;
  border: 1px solid #333a4a;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.pregunta-slider-input::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 40px;
  background-color: #00bfa5;
  border-radius: 4px;
  cursor: pointer;
}

.estimacio-label {
  font-size: 22px;
  color: #ffffff;
  background-color: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 8px;
  padding: 8px 24px;
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 10px;
}

.btn-submit {
  min-width: 190px;
  height: 46px;
  padding: 0 24px;
  background-color: #00bfa5;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  margin-top: 25px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #00a892;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
