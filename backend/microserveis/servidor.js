import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8280);
const SERVICES_FILE = process.env.SERVICES_FILE || './services.json';
const ADMIN_PASSWORD = process.env.MICROSERVEIS_PASSWORD || '';
const POLL_INTERVAL_MS = Math.max(1500, Number(process.env.POLL_INTERVAL_MS || 3000));

if (!ADMIN_PASSWORD) {
  console.error('[MICROSERVEIS] ERROR CRITIC: Falta MICROSERVEIS_PASSWORD a .env');
  process.exit(1);
}

const serveis = JSON.parse(readFileSync(SERVICES_FILE, 'utf8'));
const wss = new WebSocketServer({ port: PORT });
const ordres = { iniciar: 'start', parar: 'stop', reiniciar: 'restart' };

const ERROR_LINE_REGEX = /(?:^|\s|\[)(?:error|err|fatal|exception|unhandled|econnrefused|enotfound|etimedout|er_access_denied|cannot connect|crash|failed|\[api error\])/i;
const BENIGN_LINE_REGEX = /(?:\[Note\]|io_uring|falling back to libaio|Server\s+.*started|Servidor escoltant)/i;

const lastSnapshots = new Map();
const lastAlertKeys = new Map();

function safeComparePassword(input) {
  const a = Buffer.from(String(input || ''), 'utf8');
  const b = Buffer.from(ADMIN_PASSWORD, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function runDocker(cfg, args) {
  return new Promise((resolve) => {
    const prefix = cfg.host === 'local' ? [] : ['-H', cfg.host];
    const child = spawn('docker', [...prefix, ...args]);
    let sortida = '';
    let errors = '';
    child.stdout.on('data', (x) => { sortida += x.toString(); });
    child.stderr.on('data', (x) => { errors += x.toString(); });
    child.on('error', (e) => {
      resolve({ codi: 1, sortida, errors: errors || e.message });
    });
    child.on('close', (codi) => {
      resolve({ codi: codi ?? 1, sortida, errors });
    });
  });
}

function analyzeLogsForErrors(rawLogs) {
  const lines = String(rawLogs || '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const errorLines = [];
  for (const line of lines) {
    if (BENIGN_LINE_REGEX.test(line)) continue;
    if (ERROR_LINE_REGEX.test(line)) {
      errorLines.push(line);
    }
  }
  return {
    lines,
    errorCount: errorLines.length,
    lastError: errorLines.length > 0 ? errorLines[errorLines.length - 1] : '',
  };
}

async function inspectService(serveiId, cfg) {
  const insp = await runDocker(cfg, [
    'inspect',
    '-f',
    '{{.State.Status}}|{{.State.ExitCode}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.State.OOMKilled}}|{{.State.Error}}|{{.State.StartedAt}}',
    cfg.container,
  ]);

  let statusRaw = 'unknown';
  let exitCode = 0;
  let health = 'none';
  let oomKilled = false;
  let stateErr = '';
  let startedAt = '';

  if (insp.codi === 0 && insp.sortida) {
    const parts = insp.sortida.trim().split('|');
    statusRaw = parts[0] || 'unknown';
    exitCode = Number(parts[1] || 0);
    health = parts[2] || 'none';
    oomKilled = parts[3] === 'true';
    stateErr = parts[4] || '';
    startedAt = parts[5] || '';
  } else {
    stateErr = insp.errors.trim() || 'Contenidor no trobat';
  }

  const logArgs = startedAt && !startedAt.startsWith('0001-')
    ? ['logs', '--since', startedAt, '--tail', '60', cfg.container]
    : ['logs', '--tail', '60', cfg.container];
  const logsRes = await runDocker(cfg, logArgs);
  const combinedLogs = [logsRes.sortida, logsRes.errors].filter(Boolean).join('\n').trim();
  const analyzed = analyzeLogsForErrors(combinedLogs);

  const running = statusRaw === 'running';
  const crashStopped = !running && (exitCode !== 0 || oomKilled || statusRaw === 'dead' || statusRaw === 'restarting' || !!stateErr);
  const unhealthy = running && health === 'unhealthy';
  const hasLogErrors = analyzed.errorCount > 0;
  const hasError = crashStopped || unhealthy || hasLogErrors;

  let errorSummary = '';
  if (crashStopped) {
    errorSummary = stateErr || `Contenidor ${statusRaw} (exit ${exitCode})`;
  } else if (unhealthy) {
    errorSummary = 'Healthcheck ha fallat (unhealthy)';
  } else if (hasLogErrors) {
    errorSummary = analyzed.lastError;
  }

  let estatText = 'Aturat';
  if (running && unhealthy) estatText = 'Error (unhealthy)';
  else if (running) estatText = 'Arrancat';
  else if (crashStopped) estatText = `Caigut (${exitCode})`;

  return {
    servei: serveiId,
    label: cfg.label || serveiId,
    container: cfg.container,
    running,
    statusRaw,
    estat: estatText,
    health,
    hasError,
    errorCount: analyzed.errorCount + (crashStopped || unhealthy ? 1 : 0),
    errorSummary,
    logs: combinedLogs,
  };
}

async function buildSnapshot() {
  const entries = Object.entries(serveis);
  const items = await Promise.all(entries.map(([id, cfg]) => inspectService(id, cfg)));

  const alerts = [];
  for (const item of items) {
    lastSnapshots.set(item.servei, item);
    if (item.hasError) {
      alerts.push({
        servei: item.servei,
        label: item.label,
        severitat: !item.running || item.health === 'unhealthy' ? 'CRITICAL' : 'ERROR',
        missatge: item.errorSummary,
        errorCount: item.errorCount,
      });
    }
  }

  return { type: 'snapshot', services: items, alerts };
}

function sendJson(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastAuthenticated(obj) {
  const payload = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.authenticated && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  ws.authenticated = false;
  ws.failedAttempts = 0;
  console.log('Client connectat (pendent d\'autenticacio)');

  ws.on('message', async (raw) => {
    let peticio;
    try {
      peticio = JSON.parse(raw.toString());
    } catch {
      return sendJson(ws, { type: 'error', error: 'JSON incorrecte' });
    }

    const { servei, accio, password } = peticio || {};

    if (accio === 'auth') {
      if (ws.failedAttempts >= 5) {
        return sendJson(ws, {
          type: 'auth_error',
          error: 'Massa intents fallits. Reconnecta per tornar-ho a provar.',
        });
      }

      if (safeComparePassword(password)) {
        ws.authenticated = true;
        ws.failedAttempts = 0;
        console.log('Client autenticat correctament');
        sendJson(ws, { type: 'auth_ok' });
        const snap = await buildSnapshot();
        sendJson(ws, snap);
      } else {
        ws.failedAttempts++;
        console.warn(`Intent d'autenticacio fallit (${ws.failedAttempts})`);
        sendJson(ws, { type: 'auth_error', error: 'Contrasenya incorrecta' });
      }
      return;
    }

    if (!ws.authenticated) {
      return sendJson(ws, {
        type: 'auth_required',
        error: 'Autenticació requerida amb password',
      });
    }

    if (accio === 'estat_tots') {
      const snap = await buildSnapshot();
      return sendJson(ws, snap);
    }

    const cfg = Object.hasOwn(serveis, servei) ? serveis[servei] : null;
    if (!cfg || ![...Object.keys(ordres), 'estat', 'logs'].includes(accio)) {
      return sendJson(ws, { type: 'error', error: 'Servei o acció no permesos' });
    }

    console.log(`Petició autoritzada: servei="${servei}", accio="${accio}"`);

    if (accio === 'estat' || accio === 'logs') {
      const info = await inspectService(servei, cfg);
      return sendJson(ws, {
        type: 'resposta',
        servei,
        accio,
        codi: 0,
        sortida: accio === 'logs' ? info.logs : info.statusRaw,
        errors: info.errorSummary,
        estat: info.estat,
        hasError: info.hasError,
        errorCount: info.errorCount,
      });
    }

    const res = await runDocker(cfg, [ordres[accio], cfg.container]);
    const info = await inspectService(servei, cfg);

    sendJson(ws, {
      type: 'resposta',
      servei,
      accio,
      codi: res.codi,
      sortida: res.sortida || info.statusRaw,
      errors: res.errors || info.errorSummary,
      estat: info.estat,
      hasError: info.hasError,
      errorCount: info.errorCount,
    });

    const snap = await buildSnapshot();
    broadcastAuthenticated(snap);
  });
});

setInterval(async () => {
  const hasAuthClient = Array.from(wss.clients).some(
    (c) => c.authenticated && c.readyState === WebSocket.OPEN,
  );
  if (!hasAuthClient) return;

  try {
    const snap = await buildSnapshot();
    broadcastAuthenticated(snap);

    for (const item of snap.services) {
      const alertKey = item.hasError ? `${item.estat}|${item.errorSummary}` : '';
      const prevKey = lastAlertKeys.get(item.servei) || '';
      if (item.hasError && alertKey !== prevKey) {
        lastAlertKeys.set(item.servei, alertKey);
        broadcastAuthenticated({
          type: 'alerta',
          servei: item.servei,
          label: item.label,
          severitat: !item.running || item.health === 'unhealthy' ? 'CRITICAL' : 'ERROR',
          missatge: item.errorSummary,
        });
      } else if (!item.hasError) {
        lastAlertKeys.delete(item.servei);
      }
    }
  } catch (e) {
    console.error('[Monitor] Error consultant contenidors:', e.message);
  }
}, POLL_INTERVAL_MS);

console.log(`Gestor de microserveis securitzat escoltant al port ${PORT}...`);
