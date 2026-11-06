// Funció PURA de puntuació (no toca xarxa ni BD, per això es pot provar amb tests).
// 1a posició 3 punts, 2a 2, 3a 1; resposta exacta +2.
// Empats: comparteixen posició. Posició = 1 + nombre de jugadors amb distància ESTRICTAMENT menor.
const PUNTS = { 1: 3, 2: 2, 3: 1 };

function puntuarRonda(correcta, respostes) {
  const ambDistancia = respostes.map((r) => ({ ...r, diff: Math.abs(r.value - correcta) }));
  return ambDistancia
    .map((r) => {
      const position = 1 + ambDistancia.filter((o) => o.diff < r.diff).length;
      const points = (PUNTS[position] ?? 0) + (r.diff === 0 ? 2 : 0);
      return { ...r, position, points };
    })
    .sort((a, b) => a.position - b.position);
}

module.exports = { puntuarRonda };
