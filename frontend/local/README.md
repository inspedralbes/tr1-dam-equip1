# Configuracio Local / Electron (HowMuchLive)

Aquesta carpeta conte la configuracio standalone/Electron de `HowMuchLive` apuntant directament al servidor de produccio (`2.31.112.198`), sense dependre de `localhost` ni del port `:8090`.

## Variables (.env / .env.production)
- `VITE_SERVER_HOST=2.31.112.198`
- `VITE_WS_URL=ws://2.31.112.198`
- `VITE_API_URL=http://2.31.112.198`
- `VITE_ROUTER_MODE=hash` (necessari quan s'obre des de `file://` en Electron)
- `VITE_BASE=./` (rutes relatives d'assets per a Electron)

## Ordres
Des de `frontend/local/HowMuchLive`:
```bash
npm install
npm run dev      # Execucio local connectada a 2.31.112.198
npm run build    # Compila dist/ llest per empaquetar amb Electron
```
