<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// URL de l'API backend (configurable per provar en local o al servidor remot)
const defaultHost = import.meta.env.VITE_API_URL || window.location.origin;

const apiUrl = ref(localStorage.getItem("admin_api_url") || defaultHost);

function guardarApiUrl() {
  localStorage.setItem("admin_api_url", apiUrl.value);
  carregarDades();
}

const tabActiva = ref("preguntes");
const missatgeAlerta = ref({ text: "", tipus: "info", visible: false });

function mostrarAlerta(text, tipus = "info") {
  missatgeAlerta.value = { text, tipus, visible: true };
  setTimeout(() => {
    missatgeAlerta.value.visible = false;
  }, 5000);
}

// ----------------------------------------------------
// Dades: Categories
// ----------------------------------------------------
const categories = ref([]);
const carregarCategories = async () => {
  try {
    const res = await fetch(`${apiUrl.value}/api/categories`);
    if (!res.ok) throw new Error("Error en carregar categories");
    categories.value = await res.json();
  } catch (err) {
    mostrarAlerta(`Error categories: ${err.message}`, "error");
  }
};

const dialogCategoria = ref(false);
const categoriaEditant = ref({ id: null, nom: "" });
const errorCategoria = ref("");

function obrirNovaCategoria() {
  categoriaEditant.value = { id: null, nom: "" };
  errorCategoria.value = "";
  dialogCategoria.value = true;
}

function obrirEditarCategoria(cat) {
  categoriaEditant.value = { id: cat.id, nom: cat.nom };
  errorCategoria.value = "";
  dialogCategoria.value = true;
}

async function desarCategoria() {
  if (!categoriaEditant.value.nom.trim()) {
    errorCategoria.value = "El nom no pot estar buit";
    return;
  }
  try {
    const esCreacio = !categoriaEditant.value.id;
    const url = esCreacio
      ? `${apiUrl.value}/api/categories`
      : `${apiUrl.value}/api/categories/${categoriaEditant.value.id}`;
    const method = esCreacio ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: categoriaEditant.value.nom.trim() }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error en desar categoria");

    dialogCategoria.value = false;
    mostrarAlerta(
      `Categoria ${esCreacio ? "creada" : "modificada"} correctament!`,
      "success",
    );
    await carregarCategories();
  } catch (err) {
    errorCategoria.value = err.message;
  }
}

async function eliminarCategoria(cat) {
  if (!confirm(`Segur que vols eliminar la categoria "${cat.nom}"?`)) return;
  try {
    const res = await fetch(`${apiUrl.value}/api/categories/${cat.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "No es pot esborrar la categoria");
    }
    mostrarAlerta(`Categoria "${cat.nom}" eliminada`, "success");
    await carregarCategories();
  } catch (err) {
    mostrarAlerta(`T6 (Esborrat Protegit): ${err.message}`, "error");
  }
}

// ----------------------------------------------------
// Dades: Preguntes
// ----------------------------------------------------
const preguntes = ref([]);
const filtreCategoria = ref(null);

const carregarPreguntes = async () => {
  try {
    let url = `${apiUrl.value}/api/preguntes`;
    if (filtreCategoria.value) {
      url += `?categoria_id=${filtreCategoria.value}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error en carregar preguntes");
    preguntes.value = await res.json();
  } catch (err) {
    mostrarAlerta(`Error preguntes: ${err.message}`, "error");
  }
};

const dialogPregunta = ref(false);
const preguntaForm = ref({
  id: null,
  categoria_id: null,
  enunciat: "",
  resposta: "",
  unitat: "",
  min_valor: "",
  max_valor: "",
});
const errorPregunta = ref("");

function obrirNovaPregunta() {
  preguntaForm.value = {
    id: null,
    categoria_id: categories.value.length > 0 ? categories.value[0].id : null,
    enunciat: "",
    resposta: "",
    unitat: "",
    min_valor: "",
    max_valor: "",
  };
  errorPregunta.value = "";
  dialogPregunta.value = true;
}

function obrirEditarPregunta(p) {
  preguntaForm.value = {
    id: p.id,
    categoria_id: p.categoria_id,
    enunciat: p.enunciat,
    resposta: p.resposta,
    unitat: p.unitat,
    min_valor: p.min_valor !== null ? p.min_valor : "",
    max_valor: p.max_valor !== null ? p.max_valor : "",
  };
  errorPregunta.value = "";
  dialogPregunta.value = true;
}

async function desarPregunta() {
  try {
    const payload = {
      categoria_id: preguntaForm.value.categoria_id,
      enunciat: preguntaForm.value.enunciat,
      resposta: preguntaForm.value.resposta,
      unitat: preguntaForm.value.unitat,
      min_valor:
        preguntaForm.value.min_valor !== ""
          ? Number(preguntaForm.value.min_valor)
          : null,
      max_valor:
        preguntaForm.value.max_valor !== ""
          ? Number(preguntaForm.value.max_valor)
          : null,
    };

    const esCreacio = !preguntaForm.value.id;
    const url = esCreacio
      ? `${apiUrl.value}/api/preguntes`
      : `${apiUrl.value}/api/preguntes/${preguntaForm.value.id}`;
    const method = esCreacio ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data.detalls
        ? data.detalls.join(", ")
        : data.error || "Dada invàlida";
      throw new Error(msg);
    }

    dialogPregunta.value = false;
    mostrarAlerta(
      `Pregunta ${esCreacio ? "creada" : "modificada"} correctament!`,
      "success",
    );
    await carregarPreguntes();
  } catch (err) {
    errorPregunta.value = `Validació Sequelize (T5): ${err.message}`;
  }
}

async function eliminarPregunta(p) {
  if (!confirm(`Segur que vols eliminar la pregunta "${p.enunciat}"?`)) return;
  try {
    const res = await fetch(`${apiUrl.value}/api/preguntes/${p.id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("No s'ha pogut eliminar la pregunta");
    mostrarAlerta("Pregunta eliminada correctament", "success");
    await carregarPreguntes();
  } catch (err) {
    mostrarAlerta(`Error: ${err.message}`, "error");
  }
}

// ----------------------------------------------------
// Dades: Fitxers (Importació JSON & Exportació CSV)
// ----------------------------------------------------
const jsonText = ref("");
const fitxerSeleccionat = ref(null);
const informeImportacio = ref(null);
const carregantImportacio = ref(false);

function carregarExempleJSON() {
  const exemple = [
    {
      enunciat: "Quants segons té un dia sencer?",
      resposta: 86400,
      unitat: "segons",
      categoria: "Ciència",
      min_valor: 1000,
      max_valor: 100000,
    },
    {
      enunciat: "Quants pisos té la Torre Eiffel?",
      resposta: 3,
      unitat: "pisos",
      categoria: "Cultura",
      min_valor: 1,
      max_valor: 10,
    },
    {
      enunciat: "Pregunta invàlida de prova 1 (resposta no numèrica)",
      resposta: "tres",
      unitat: "unitats",
      categoria: "Ciència",
    },
    {
      enunciat: "",
      resposta: 50,
      unitat: "km",
      categoria: "Geografia",
    },
  ];
  jsonText.value = JSON.stringify(exemple, null, 2);
}

async function importarJSON() {
  carregantImportacio.value = true;
  informeImportacio.value = null;

  try {
    let dades = null;

    if (jsonText.value.trim()) {
      dades = JSON.parse(jsonText.value);
    } else if (fitxerSeleccionat.value) {
      const text = await fitxerSeleccionat.value.text();
      dades = JSON.parse(text);
    } else {
      throw new Error("Selecciona un fitxer .json o enganxa el text JSON");
    }

    const res = await fetch(`${apiUrl.value}/api/preguntes/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preguntes: dades }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error en importar preguntes");

    informeImportacio.value = data;
    mostrarAlerta(
      `Importació completada: ${data.importades} vàlides, ${data.descartades.length} descartades`,
      "success",
    );
    await carregarPreguntes();
  } catch (err) {
    mostrarAlerta(`Error d'importació (T12a): ${err.message}`, "error");
  } finally {
    carregantImportacio.value = false;
  }
}

// Exportació CSV
const partides = ref([]);
const carregarPartides = async () => {
  try {
    const res = await fetch(`${apiUrl.value}/api/partides`);
    if (res.ok) {
      partides.value = await res.json();
    }
  } catch (e) {
    console.warn("No s'han pogut llistar partides:", e.message);
  }
};

const partidaIdManual = ref("");

function descarregarCSV(id) {
  const targetId = id || partidaIdManual.value;
  if (!targetId) {
    mostrarAlerta("Cal indicar un ID de partida per exportar", "warning");
    return;
  }
  const url = `${apiUrl.value}/api/partides/${targetId}/exportar-csv`;
  window.open(url, "_blank");
}

// Carregar dades inicials
function carregarDades() {
  carregarCategories();
  carregarPreguntes();
  carregarPartides();
}

onMounted(() => {
  carregarDades();
});
</script>

<template>
  <v-container class="admin-page">
    <div class="admin-wrapper">
      <!-- Capçalera -->
      <div class="admin-header">
        <div>
          <h1 class="admin-title">Panell d'Administració</h1>
          <p class="admin-subtitle">
            Banc de preguntes (RAD-2/RA3) i Gestió de fitxers (RAD-5/RA1)
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            class="back-btn"
            prepend-icon="mdi-arrow-left"
            @click="router.push({ name: 'home' })"
          >
            Tornar al Joc
          </v-btn>
        </div>
      </div>

      <!-- Barra de configuració URL API -->
      <div class="api-bar">
        <span class="api-label">Servidor Backend:</span>
        <input
          v-model="apiUrl"
          class="api-input"
          placeholder="https://tr1grup1.dam.inspedralbes.cat"
        />
        <v-btn size="small" class="api-btn" @click="guardarApiUrl"
          >Connectar</v-btn
        >
      </div>

      <!-- Alerta global -->
      <v-alert
        v-if="missatgeAlerta.visible"
        :type="missatgeAlerta.tipus"
        class="mb-4"
        closable
        @click:close="missatgeAlerta.visible = false"
      >
        {{ missatgeAlerta.text }}
      </v-alert>

      <!-- Pestanyes -->
      <v-card class="admin-card" flat>
        <v-tabs v-model="tabActiva" color="primary" class="admin-tabs">
          <v-tab value="preguntes">Preguntes (CRUD)</v-tab>
          <v-tab value="categories">Categories (CRUD)</v-tab>
          <v-tab value="fitxers">Fitxers (JSON & CSV)</v-tab>
        </v-tabs>

        <v-card-text class="pt-6">
          <!-- ============================================== -->
          <!-- PESTANYA 1: PREGUNTES                          -->
          <!-- ============================================== -->
          <div v-if="tabActiva === 'preguntes'">
            <div class="table-toolbar">
              <div class="filter-box">
                <label>Filtrar per Categoria:</label>
                <select
                  v-model="filtreCategoria"
                  class="custom-select"
                  @change="carregarPreguntes"
                >
                  <option :value="null">Totes les categories</option>
                  <option v-for="c in categories" :key="c.id" :value="c.id">
                    {{ c.nom }}
                  </option>
                </select>
              </div>
              <v-btn class="primary-btn" @click="obrirNovaPregunta"
                >+ Nova Pregunta</v-btn
              >
            </div>

            <div class="table-responsive">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Enunciat</th>
                    <th>Resposta</th>
                    <th>Unitat</th>
                    <th>Rang (Mín-Màx)</th>
                    <th>Categoria</th>
                    <th style="text-align: right">Accions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="preguntes.length === 0">
                    <td colspan="7" class="text-center py-4">
                      No hi ha preguntes disponibles
                    </td>
                  </tr>
                  <tr v-for="p in preguntes" :key="p.id">
                    <td>{{ p.id }}</td>
                    <td class="font-weight-bold">{{ p.enunciat }}</td>
                    <td>
                      <span class="badge-accent">{{ p.resposta }}</span>
                    </td>
                    <td>{{ p.unitat }}</td>
                    <td>
                      {{ p.min_valor !== null ? p.min_valor : "-" }} a
                      {{ p.max_valor !== null ? p.max_valor : "-" }}
                    </td>
                    <td>
                      {{ p.categoria ? p.categoria.nom : p.categoria_id }}
                    </td>
                    <td style="text-align: right">
                      <v-btn
                        size="small"
                        variant="text"
                        class="mr-1 text-teal"
                        @click="obrirEditarPregunta(p)"
                        >Editar</v-btn
                      >
                      <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        @click="eliminarPregunta(p)"
                        >Eliminar</v-btn
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ============================================== -->
          <!-- PESTANYA 2: CATEGORIES                         -->
          <!-- ============================================== -->
          <div v-if="tabActiva === 'categories'">
            <div class="table-toolbar">
              <p class="toolbar-hint">
                Requisit T6: No es pot eliminar una categoria que tingui
                preguntes associades.
              </p>
              <v-btn class="primary-btn" @click="obrirNovaCategoria"
                >+ Nova Categoria</v-btn
              >
            </div>

            <div class="table-responsive">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th style="width: 80px">ID</th>
                    <th>Nom de la Categoria</th>
                    <th style="text-align: right; width: 200px">Accions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="categories.length === 0">
                    <td colspan="3" class="text-center py-4">
                      No hi ha categories creades
                    </td>
                  </tr>
                  <tr v-for="c in categories" :key="c.id">
                    <td>{{ c.id }}</td>
                    <td class="font-weight-bold">{{ c.nom }}</td>
                    <td style="text-align: right">
                      <v-btn
                        size="small"
                        variant="text"
                        class="mr-1 text-teal"
                        @click="obrirEditarCategoria(c)"
                        >Editar</v-btn
                      >
                      <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        @click="eliminarCategoria(c)"
                        >Eliminar</v-btn
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ============================================== -->
          <!-- PESTANYA 3: FITXERS (JSON I CSV)               -->
          <!-- ============================================== -->
          <div v-if="tabActiva === 'fitxers'">
            <div class="files-grid">
              <!-- Secció Importació JSON -->
              <div class="file-box">
                <h3 class="box-title">
                  Importar Preguntes des de JSON (T12a / T12b)
                </h3>
                <p class="box-desc">
                  Valida les preguntes amb <code>validarPregunta()</code>,
                  insereix les vàlides mitjançant Sequelize i genera un informe
                  amb les descartades.
                </p>

                <div class="d-flex gap-2 mb-3">
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    @click="carregarExempleJSON"
                  >
                    Carregar Exemple JSON de Prova
                  </v-btn>
                </div>

                <textarea
                  v-model="jsonText"
                  class="custom-textarea"
                  rows="7"
                  placeholder="Enganxa un array JSON de preguntes aquí o selecciona un fitxer..."
                ></textarea>

                <div class="mt-4">
                  <v-btn
                    class="primary-btn"
                    :loading="carregantImportacio"
                    @click="importarJSON"
                  >
                    Executar Importació JSON
                  </v-btn>
                </div>

                <!-- Informe d'importació -->
                <div v-if="informeImportacio" class="import-report mt-4">
                  <h4 class="report-title">
                    Resultat de la Validació i Importació:
                  </h4>
                  <div class="report-stats">
                    <span class="stat-badge success"
                      >Vàlides importades:
                      {{ informeImportacio.importades }}</span
                    >
                    <span class="stat-badge error"
                      >Descartades:
                      {{ informeImportacio.descartades.length }}</span
                    >
                  </div>

                  <div
                    v-if="informeImportacio.descartades.length > 0"
                    class="discarded-list mt-3"
                  >
                    <p class="font-weight-bold text-error mb-2">
                      Detall de Preguntes Descartades i Motius:
                    </p>
                    <div
                      v-for="(item, idx) in informeImportacio.descartades"
                      :key="idx"
                      class="discarded-item"
                    >
                      <div class="discarded-text">
                        "{{ item.pregunta.enunciat || "(Sense enunciat)" }}"
                      </div>
                      <ul class="discarded-errors">
                        <li v-for="(err, i) in item.motius" :key="i">
                          {{ err }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Secció Exportació CSV -->
              <div class="file-box">
                <h3 class="box-title">Exportar Partida Acabada a CSV (T13)</h3>
                <p class="box-desc">
                  Genera un fitxer CSV complet amb
                  <code>csv-stringify</code> contenint la classificació final i
                  el detall de respostes per ronda.
                </p>

                <div class="mb-4">
                  <label class="d-block mb-1 font-weight-bold text-grey"
                    >Descarregar per ID de Partida:</label
                  >
                  <div class="d-flex gap-2">
                    <input
                      v-model="partidaIdManual"
                      type="number"
                      class="api-input"
                      placeholder="ID Partida (ex: 1)"
                    />
                    <v-btn class="primary-btn" @click="descarregarCSV()"
                      >Descarregar CSV</v-btn
                    >
                  </div>
                </div>

                <div v-if="partides.length > 0">
                  <label class="d-block mb-2 font-weight-bold text-grey"
                    >O tria una partida de la base de dades:</label
                  >
                  <div class="table-responsive" style="max-height: 250px">
                    <table class="custom-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Codi</th>
                          <th>Estat</th>
                          <th>Acció</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="part in partides" :key="part.id">
                          <td>{{ part.id }}</td>
                          <td>
                            <span class="code-badge">{{ part.codi }}</span>
                          </td>
                          <td>{{ part.estat }}</td>
                          <td>
                            <v-btn
                              size="small"
                              variant="text"
                              color="primary"
                              @click="descarregarCSV(part.id)"
                            >
                              CSV
                            </v-btn>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- DIÀLOG: CREAR / EDITAR CATEGORIA -->
    <v-dialog v-model="dialogCategoria" max-width="450">
      <v-card class="admin-dialog">
        <v-card-title class="dialog-title">
          {{ categoriaEditant.id ? "Editar Categoria" : "Nova Categoria" }}
        </v-card-title>
        <v-card-text>
          <label class="input-label">Nom de la categoria:</label>
          <input
            v-model="categoriaEditant.nom"
            class="custom-input"
            placeholder="Ex: Història de l'Art"
            @keyup.enter="desarCategoria"
          />
          <p v-if="errorCategoria" class="text-error mt-2">
            {{ errorCategoria }}
          </p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" @click="dialogCategoria = false"
            >Cancel·lar</v-btn
          >
          <v-btn class="primary-btn" @click="desarCategoria">Desar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIÀLOG: CREAR / EDITAR PREGUNTA -->
    <v-dialog v-model="dialogPregunta" max-width="600">
      <v-card class="admin-dialog">
        <v-card-title class="dialog-title">
          {{ preguntaForm.id ? "Editar Pregunta" : "Nova Pregunta" }}
        </v-card-title>
        <v-card-text>
          <label class="input-label">Categoria:</label>
          <select
            v-model="preguntaForm.categoria_id"
            class="custom-select mb-3"
          >
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.nom }}
            </option>
          </select>

          <label class="input-label">Enunciat de la pregunta:</label>
          <textarea
            v-model="preguntaForm.enunciat"
            class="custom-textarea mb-3"
            rows="3"
            placeholder="Quants quilòmetres mesura..."
          ></textarea>

          <div class="row-2">
            <div>
              <label class="input-label">Resposta correcta (numèrica):</label>
              <input
                v-model="preguntaForm.resposta"
                class="custom-input"
                placeholder="Ex: 1000"
              />
            </div>
            <div>
              <label class="input-label">Unitat de mesura:</label>
              <input
                v-model="preguntaForm.unitat"
                class="custom-input"
                placeholder="Ex: km, kg, litres"
              />
            </div>
          </div>

          <div class="row-2 mt-3">
            <div>
              <label class="input-label">Valor Mínim (Opcional):</label>
              <input
                v-model="preguntaForm.min_valor"
                type="number"
                class="custom-input"
                placeholder="0"
              />
            </div>
            <div>
              <label class="input-label">Valor Màxim (Opcional):</label>
              <input
                v-model="preguntaForm.max_valor"
                type="number"
                class="custom-input"
                placeholder="10000"
              />
            </div>
          </div>

          <p v-if="errorPregunta" class="text-error mt-3">
            {{ errorPregunta }}
          </p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" @click="dialogPregunta = false"
            >Cancel·lar</v-btn
          >
          <v-btn class="primary-btn" @click="desarPregunta">Desar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background-color: transparent;
  padding: 30px 20px;
  color: #ffffff;
  max-width: 1200px !important;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.admin-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.admin-subtitle {
  color: #94a3b8;
  font-size: 14px;
}

.back-btn {
  background-color: #333a4a !important;
  color: #ffffff !important;
  border-radius: 8px;
  text-transform: none;
}

.api-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #242834;
  border: 1px solid #333a4a;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.api-label {
  font-size: 14px;
  color: #94a3b8;
}

.api-input {
  flex: 1;
  background: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 6px;
  padding: 6px 12px;
  color: #ffffff;
}

.api-btn {
  background: #00bfa5 !important;
  color: #ffffff !important;
  text-transform: none;
}

.admin-card {
  background-color: #242834 !important;
  border: 1px solid #333a4a;
  border-radius: 12px;
  padding: 16px;
}

.admin-tabs {
  border-bottom: 1px solid #333a4a;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.filter-box {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #94a3b8;
}

.custom-select,
.custom-input,
.custom-textarea {
  background: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 6px;
  color: #ffffff;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

.custom-select {
  width: auto;
  min-width: 220px;
}

.primary-btn {
  background-color: #00bfa5 !important;
  color: #ffffff !important;
  font-weight: 700;
  border-radius: 8px;
  text-transform: none;
}

.table-responsive {
  overflow-x: auto;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th {
  background: #1d212b;
  color: #94a3b8;
  padding: 12px 14px;
  font-size: 13px;
  text-align: left;
  border-bottom: 1px solid #333a4a;
}

.custom-table td {
  padding: 12px 14px;
  font-size: 14px;
  border-bottom: 1px solid #2d3342;
  color: #ffffff;
}

.badge-accent {
  background: #142926;
  border: 1px solid #00bfa5;
  color: #00bfa5;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.code-badge {
  background: #1d212b;
  border: 1px solid #333a4a;
  color: #38bdf8;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.files-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .files-grid {
    grid-template-columns: 1fr;
  }
}

.file-box {
  background: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 8px;
  padding: 20px;
}

.box-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}

.box-desc {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
  line-height: 1.5;
}

.import-report {
  background: #242834;
  border: 1px solid #333a4a;
  border-radius: 8px;
  padding: 16px;
}

.report-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 10px;
}

.report-stats {
  display: flex;
  gap: 10px;
}

.stat-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

.stat-badge.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid #10b981;
}

.stat-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.discarded-item {
  background: #1d212b;
  border: 1px solid #333a4a;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
}

.discarded-text {
  font-weight: bold;
  color: #ffffff;
  font-size: 13px;
}

.discarded-errors {
  margin: 6px 0 0 16px;
  font-size: 12px;
  color: #f87171;
}

.text-error {
  color: #f87171;
  font-size: 13px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.admin-dialog {
  background: #242834 !important;
  border: 1px solid #333a4a;
  border-radius: 12px;
  color: #ffffff;
  padding: 16px;
}

.dialog-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
}
</style>
