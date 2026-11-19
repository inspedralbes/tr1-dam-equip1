<script setup>
import { ref, reactive, watch } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { usePlayerStore } from "@/stores/player";

import { useRouter } from "vue-router";
const router = useRouter();

//Constants de la sala
import { useRoomStore, CONFIG_PER_DEFECTE } from "@/stores/room";
const room = useRoomStore();
const connexio = useConnectionStore();

const player = usePlayerStore();

//Codi per gestionar nom jugador
const nomInput = ref("");
const error = ref("");

function registrar() {
  const ok = player.registrarNom(nomInput.value);
  error.value = ok ? "" : "El nom no pot estar buit";
}
const nom = ref("Introdueix el teu nom");
if (player.nom != null && player.nom.trim() !== "") {
  nom.value = player.nom;
}
//Codi gestionar codi sala
const codiSala = ref("");
const errorUnir = ref("");

let ultimaAccio = "";

async function unirse() {
  registrar();
  if (!player.estaRegistrat) {
    errorUnir.value = "Primer has d'escriure el teu nom";
    return;
  }

  const codi = codiSala.value.trim();
  if (codi === "") {
    errorUnir.value = "Introdueix un codi de sala";
    return;
  }
  if (!/^\d{5}$/.test(codi)) {
    errorUnir.value = "El codi ha de tenir 5 xifres";
    return;
  }

  errorUnir.value = "";
  ultimaAccio = "unir";

  try {
    await connexio.connectar();
    connexio.enviar({
      type: "joinRoom",
      roomId: Number(codi),
      name: player.nom,
    });
  } catch (e) {
    errorUnir.value = "No s'ha pogut connectar amb el servidor";
  }
}

//Codi per gestionar crear sala
const dialogCrear = ref(false);
const errorCrear = ref("");

function obrirCrearSala() {
  registrar();
  errorCrear.value = "";
  Object.assign(configSala, CONFIG_PER_DEFECTE);
  dialogCrear.value = true;
}

const configSala = reactive({
  ...CONFIG_PER_DEFECTE,
});

//Gestió del popup de crear sala
const opcionsJugadors = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const opcionsRondes = [5, 6, 7, 8, 9, 10];

async function crearSala() {
  if (!player.estaRegistrat) {
    errorCrear.value = "Primer has d'escriure el teu nom";
    return;
  }
  errorCrear.value = "";
  ultimaAccio = "crear";
  dialogCrear.value = false;

  try {
    await connexio.connectar();
    connexio.enviar({
      type: "createRoom",
      name: player.nom,
      maxPlayers: configSala.maxJugadors,
      totalRounds: configSala.rondes,
    });
    router.push({ name: "sala-espera" });
  } catch (e) {
    errorCrear.value = "No s'ha pogut connectar amb el servidor";
    console.log(e.message);
  }
}

const MISSATGES_ERROR = {
  NAME_TAKEN: "Aquest nom ja està en ús a la sala",
  ROOM_FULL: "La sala està plena",
  ROOM_NOT_FOUND: "No existeix cap sala amb aquest codi",
  INVALID_STATE: "La partida ja ha començat",
};

watch(
  () => room.codi,
  (nou) => {
    if (nou !== "") {
      router.push({ name: "sala-espera" });
    }
  },
);

watch(
  () => connexio.errorServidor,
  (error) => {
    if (!error) return;

    const text =
      MISSATGES_ERROR[error.code] ??
      error.message ??
      "Error desconegut del servidor";
    if (ultimaAccio === "unir") {
      errorUnir.value = text;
    } else {
      errorCrear.value = text;
    }
  },
);
</script>

<template>
  <v-container class="index-page">
    <div class="index-card">
      <h2 class="index-title">HowMuch?LIVE</h2>

      <v-text-field
        class="index-field"
        v-model="nomInput"
        :placeholder="nom"
        :error-messages="error"
        @keyup.enter="registrar"
      />

      <p v-if="player.estaRegistrat" class="welcome-message">
        Endavant, {{ player.nom }}!
      </p>

      <div class="fila-codi">
        <v-text-field
          class="index-field"
          v-model="codiSala"
          placeholder="Codi de Sala"
          :error-messages="errorUnir"
          @keyup.enter="unirse"
        />
      </div>

      <div class="action-row">
        <v-btn class="secondary-btn" @click="obrirCrearSala">Crear sala</v-btn>
        <v-btn class="primary-btn" @click="unirse">Unir-se</v-btn>
      </div>

      <div class="admin-access-row">
        <v-btn variant="text" size="small" class="admin-nav-btn" @click="router.push({ name: 'admin' })">
          ⚙️ Panell d'Administració
        </v-btn>
      </div>

      <v-dialog v-model="dialogCrear" max-width="500" class="index-dialog">
        <v-card title="Crear sala">
          <v-card-text>
            <v-radio-group v-model="configSala.visibilitat" label="Visibilitat">
              <v-radio label="Privada" value="privada"></v-radio>
              <v-radio label="Pública" value="publica"></v-radio>
            </v-radio-group>

            <v-select
              v-model="configSala.maxJugadors"
              :items="opcionsJugadors"
              label="Màxim de jugadors"
            />

            <v-select
              v-model="configSala.rondes"
              :items="opcionsRondes"
              label="Nombre de rondes"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="dialogCrear = false">Cancel·lar</v-btn>
            <v-btn @click="crearSala">Crear</v-btn>
          </v-card-actions>
        </v-card>
        <p v-if="errorCrear" class="text-error mt-2">{{ errorCrear }}</p>
      </v-dialog>
    </div>
  </v-container>
</template>

<style scoped>
.fila-codi {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.index-page {
  min-height: 100vh;
  background-color: #181b22;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  margin: 0;
}

.index-card {
  width: min(100%, 480px);
  background-color: #242834;
  border: 1px solid #333a4a;
  border-radius: 12px;
  padding: 32px 36px;
  box-shadow: none;
}

.index-title {
  font-size: 32px;
  color: #ffffff;
  font-weight: 700;
  text-align: center;
  margin: 0 0 22px;
}

.welcome-message {
  margin: 12px 0 8px;
  color: #dfe7f5;
}

.fila-codi {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.index-field {
  margin-bottom: 12px;
}

.index-field :deep(.v-field) {
  background-color: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 8px;
  min-height: 44px;
  color: #ffffff;
}

.index-field :deep(.v-field__outline) {
  display: none;
}

.index-field :deep(.v-field__input) {
  color: #ffffff;
  font-size: 16px;
  padding: 0 12px;
  min-height: 44px;
}

.index-field :deep(.v-label) {
  color: #94a3b8 !important;
}

.index-field :deep(.v-field__input::placeholder) {
  color: #94a3b8;
  opacity: 1;
}

.index-field :deep(.v-field--focused .v-field) {
  border-color: #00bfa5 !important;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.secondary-btn,
.primary-btn {
  flex: 1 1 0;
  height: 46px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: none;
  border: 0;
}

.admin-access-row {
  margin-top: 20px;
  text-align: center;
  border-top: 1px solid #333a4a;
  padding-top: 14px;
}

.admin-nav-btn {
  color: #94a3b8 !important;
  font-size: 13px !important;
  text-transform: none;
}

.admin-nav-btn:hover {
  color: #00bfa5 !important;
  background: rgba(0, 191, 165, 0.08);
}

.index-page {
  width: 100%;
  max-width: none !important;
  min-height: 100vh;
  background-color: #181b22;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  margin: 0;
}

.index-card {
  width: min(100%, 480px);
  margin: 0 auto;
  background-color: #242834;
  border: 1px solid #333a4a;
  border-radius: 12px;
  padding: 32px 36px;
  box-shadow: none;
}

.secondary-btn {
  background-color: #374151 !important;
  color: #f3f4f6 !important;
}

.secondary-btn:hover {
  background-color: #4b5563 !important;
}

.primary-btn {
  background-color: #00bfa5 !important;
  color: #ffffff !important;
}

.primary-btn:hover {
  background-color: #00a892 !important;
}

.index-dialog :deep(.v-card) {
  background-color: #242834;
  border: 1px solid #333a4a;
  border-radius: 12px;
  color: #ffffff;
}

.index-dialog :deep(.v-card-title) {
  color: #ffffff;
}

.index-dialog :deep(.v-label),
.index-dialog :deep(.v-radio),
.index-dialog :deep(.v-select .v-select__selection-text),
.index-dialog :deep(.v-select .v-field__input) {
  color: #ffffff !important;
}

.index-dialog :deep(.v-field) {
  background-color: #1d212b;
  border-radius: 8px;
  color: #ffffff;
}

.index-dialog :deep(.v-field__outline) {
  display: none;
}

.text-error {
  color: #ff6b6b;
  margin-top: 8px;
}
</style>
