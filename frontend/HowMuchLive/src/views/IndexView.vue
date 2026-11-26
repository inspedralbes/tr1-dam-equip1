<script setup>
import { ref, reactive, watch } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { usePlayerStore } from "@/stores/player";
import { useRouter } from "vue-router";
import { useRoomStore, CONFIG_PER_DEFECTE } from "@/stores/room";
import AvatarBadge from "@/components/AvatarBadge.vue";

const router = useRouter();
const room = useRoomStore();
const connexio = useConnectionStore();
const player = usePlayerStore();

const mostrarSelectorAvatar = ref(false);
const opcionsAvatar = [0, 1, 2, 3, 4, 5, 6, 7];

function triarAvatar(id) {
  player.seleccionarAvatar(id);
  mostrarSelectorAvatar.value = false;
}

const nomInput = ref(player.nom || "");
const error = ref("");

function registrar() {
  const ok = player.registrarNom(nomInput.value);
  error.value = ok ? "" : "El nom no pot estar buit";
}

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
      avatar: player.avatar,
    });
  } catch (e) {
    errorUnir.value = "No s'ha pogut connectar amb el servidor";
  }
}

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
      avatar: player.avatar,
      maxPlayers: configSala.maxJugadors,
      totalRounds: configSala.rondes,
    });
    router.push({ name: "sala-espera" });
  } catch (e) {
    errorCrear.value = "No s'ha pogut connectar amb el servidor";
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
  (err) => {
    if (!err) return;
    const text =
      MISSATGES_ERROR[err.code] ?? err.message ?? "Error desconegut del servidor";
    if (ultimaAccio === "unir") {
      errorUnir.value = text;
    } else {
      errorCrear.value = text;
    }
  },
);
</script>

<template>
  <div class="studio-backdrop">
    <div class="studio-card index-card panel-enter">
      <!-- Selector d'avatar a dalt de tot -->
      <div class="avatar-header">
        <button
          type="button"
          class="avatar-trigger"
          @click="mostrarSelectorAvatar = !mostrarSelectorAvatar"
          title="Canviar avatar"
        >
          <AvatarBadge :avatar-id="player.avatar" :size="76" clickable />
          <span class="avatar-edit-pill">Canviar avatar</span>
        </button>
      </div>

      <div v-if="mostrarSelectorAvatar" class="avatar-picker-panel">
        <div class="avatar-picker-label">Escull el teu avatar</div>
        <div class="avatar-grid">
          <button
            v-for="id in opcionsAvatar"
            :key="id"
            type="button"
            class="avatar-option-btn"
            :class="{ 'is-active': player.avatar === id }"
            @click="triarAvatar(id)"
          >
            <AvatarBadge :avatar-id="id" :size="48" :selected="player.avatar === id" clickable />
          </button>
        </div>
      </div>

      <h1 class="index-title">How Much?! <span class="title-live">LIVE</span></h1>

      <label class="field-label">Nom de jugador</label>
      <v-text-field
        class="index-field"
        v-model="nomInput"
        placeholder="Escriu el teu nom..."
        :error-messages="error"
        @keyup.enter="registrar"
      />

      <label class="field-label">Codi de sala</label>
      <v-text-field
        class="index-field"
        v-model="codiSala"
        placeholder="Codi de 5 xifres per unir-te"
        :error-messages="errorUnir"
        @keyup.enter="unirse"
      />

      <div class="action-row">
        <v-btn class="secondary-btn" @click="obrirCrearSala">Crear sala</v-btn>
        <v-btn class="primary-btn" @click="unirse">Unir-se</v-btn>
      </div>

      <div class="admin-access-row">
        <v-btn
          variant="text"
          size="small"
          class="admin-nav-btn"
          @click="router.push({ name: 'admin' })"
        >
          Panell d'Administració
        </v-btn>
      </div>

      <v-dialog v-model="dialogCrear" max-width="460" class="index-dialog">
        <v-card title="Configuració de la sala">
          <v-card-text>
            <v-radio-group v-model="configSala.visibilitat" label="Visibilitat" inline>
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
            <v-btn variant="text" @click="dialogCrear = false">Cancel·lar</v-btn>
            <v-btn class="dialog-confirm-btn" @click="crearSala">Crear sala</v-btn>
          </v-card-actions>
        </v-card>
        <p v-if="errorCrear" class="text-error mt-2">{{ errorCrear }}</p>
      </v-dialog>
    </div>
  </div>
</template>

<style scoped>
.index-card {
  width: min(100%, 480px);
  padding: 28px 34px 24px;
}

.avatar-header {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.avatar-trigger {
  background: transparent;
  border: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar-edit-pill {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #5eead4;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.4);
  padding: 3px 12px;
  border-radius: 999px;
  transition: background-color 0.15s, border-color 0.15s;
}

.avatar-trigger:hover .avatar-edit-pill {
  background: rgba(20, 184, 166, 0.22);
  border-color: #14b8a6;
}

.avatar-picker-panel {
  background-color: #121620;
  border: 1px solid #2a3346;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 18px;
}

.avatar-picker-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 10px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  justify-items: center;
}

.avatar-option-btn {
  background: transparent;
  border: 0;
  padding: 4px;
  border-radius: 50%;
  cursor: pointer;
}

.index-title {
  font-size: 30px;
  color: #ffffff;
  font-weight: 800;
  text-align: center;
  margin: 4px 0 20px;
  letter-spacing: -0.5px;
}

.title-live {
  color: #14b8a6;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 6px;
}

.index-field {
  margin-bottom: 10px;
}

.index-field :deep(.v-field) {
  background-color: #121620;
  border: 1px solid #2a3346;
  border-radius: 8px;
  min-height: 44px;
  color: #ffffff;
}

.index-field :deep(.v-field__outline) {
  display: none;
}

.index-field :deep(.v-field__input) {
  color: #ffffff;
  font-size: 15px;
  padding: 0 12px;
  min-height: 44px;
}

.index-field :deep(.v-field__input::placeholder) {
  color: #64748b;
  opacity: 1;
}

.index-field :deep(.v-field--focused .v-field) {
  border-color: #14b8a6 !important;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.secondary-btn,
.primary-btn {
  flex: 1 1 0;
  height: 46px !important;
  border-radius: 8px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  box-shadow: none !important;
}

.secondary-btn {
  background-color: #262e3f !important;
  color: #f1f5f9 !important;
  border: 1px solid #384359 !important;
}

.secondary-btn:hover {
  background-color: #323c52 !important;
}

.primary-btn {
  background-color: #14b8a6 !important;
  color: #0b1116 !important;
}

.primary-btn:hover {
  background-color: #0d9488 !important;
  color: #ffffff !important;
}

.admin-access-row {
  margin-top: 18px;
  text-align: center;
  border-top: 1px solid #2a3346;
  padding-top: 12px;
}

.admin-nav-btn {
  color: #94a3b8 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  text-transform: none !important;
}

.admin-nav-btn:hover {
  color: #14b8a6 !important;
  background: rgba(20, 184, 166, 0.08) !important;
}

.index-dialog :deep(.v-card) {
  background-color: #181d28;
  border: 1px solid #2a3346;
  border-top: 4px solid #14b8a6;
  border-radius: 12px;
  color: #ffffff;
}

.index-dialog :deep(.v-label),
.index-dialog :deep(.v-radio),
.index-dialog :deep(.v-select .v-select__selection-text),
.index-dialog :deep(.v-select .v-field__input) {
  color: #ffffff !important;
}

.index-dialog :deep(.v-field) {
  background-color: #121620;
  border: 1px solid #2a3346;
  border-radius: 8px;
  color: #ffffff;
}

.index-dialog :deep(.v-field__outline) {
  display: none;
}

.dialog-confirm-btn {
  background-color: #14b8a6 !important;
  color: #0b1116 !important;
  font-weight: 700 !important;
  text-transform: none !important;
}

.text-error {
  color: #fb7185;
  margin-top: 8px;
}
</style>
