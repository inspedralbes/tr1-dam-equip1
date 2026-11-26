# HowMuch Live Grup1

Projecte transversal de 2n de DAM (Desenvolupament d'Aplicacions Multiplataforma) consistent en un joc multijugador d'estimació numèrica en temps real.

Els jugadors s'uneixen a una mateixa sala mitjançant un codi, voten les categories de les preguntes i competeixen per torns aproximant-se el màxim possible a la resposta correcta sobre una escala numèrica.

---

## Dades del projecte

- **Nom del projecte:** HowMuch Live Grup1
- **Integrants:** Unai, Josep, Pol
- **URL de producció:** [http://grup1howmuch.dam.inspedralbes.cat/howmuch/](http://grup1howmuch.dam.inspedralbes.cat/howmuch/)
- **Gestor de tasques (Taiga):** [https://tree.taiga.io/project/poldones-tr1_howmuch_grup1/backlog](https://tree.taiga.io/project/poldones-tr1_howmuch_grup1/backlog)
- **Prototip gràfic (Penpot):** Disponible en PDF a [`docs/Penpot.pdf`](docs/Penpot.pdf)
- **Estat del projecte:** Completat. Servidor en producció desplegat amb contenidors Docker, base de dades MariaDB inicialitzada amb banc de preguntes per categories, aplicació web responsiva, clients d'escriptori en Electron i Unity, i eina de gestió de microserveis operativa.

---

## Estructura del repositori

```text
├── backend/
│   ├── docker/              # Dockerfile, docker-compose.yml i configuració Nginx
│   │   ├── Servidor/        # Servidor backend Express + WebSockets (partida i API)
│   │   └── db/              # Esquema SQL (01-schema.sql) i dades inicials (02-dades-inicials.sql)
│   └── microserveis/        # Servidor de control de serveis per WebSocket securitzat
├── frontend/
│   ├── HowMuchLive/         # Client web responsive desenvolupat amb Vue 3, Vite i Vuetify
│   ├── local/HowMuchLive/   # Client d'escriptori empaquetat amb Electron
│   ├── unity/               # Client del joc desenvolupat amb Unity i UI Toolkit
│   └── microserveis/        # Aplicació d'escriptori en Unity per a la gestió de microserveis
└── docs/                    # Documentació i prototips del projecte (Penpot.pdf)
```

---

## Tecnologies utilitzades

- **Backend:** Node.js, Express, WebSockets (`ws`), MariaDB, Docker i Docker Compose.
- **Frontend Web & Electron:** Vue 3, Vite, Pinia, Vue Router, Vuetify 3, HTML5 SVG, Electron.
- **Frontend Unity:** Unity 6, UI Toolkit (UXML i USS), C#.
- **Servidor Web / Proxy Invers:** Nginx amb terminació SSL i suport WebSocket (`Upgrade`).

---

## Execució en local

### 1. Servidor i Base de Dades (Docker)
```bash
cd backend/docker
docker compose up -d --build
```
El servidor s'aixecarà escoltant al port `3000` (o port `80` a través del proxy Nginx).

### 2. Client Web (Vue)
```bash
cd frontend/HowMuchLive
npm install
npm run dev
```

### 3. Client d'Escriptori (Electron)
```bash
cd frontend/local/HowMuchLive
npm install
npm run electron
```

### 4. Gestor de Microserveis
```bash
cd backend/microserveis
npm install
node servidor.js
```

### 5. Clients Unity
Obrir les carpetes `frontend/unity` o `frontend/microserveis` des d'Unity Hub (versió: Unity 6) i executar l'escena inicial.
