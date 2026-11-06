const test = require('node:test');
const assert = require('node:assert');
const { puntuarRonda } = require('../src/game/scoring');
const { rangSlider } = require('../src/game/slider');

const punts = (res) => Object.fromEntries(res.map((r) => [r.playerId, r.points]));

test('sense empats: 3, 2, 1, 0', () => {
  const res = puntuarRonda(100, [
    { playerId: 1, value: 90 }, { playerId: 2, value: 80 },
    { playerId: 3, value: 70 }, { playerId: 4, value: 10 },
  ]);
  assert.deepStrictEqual(punts(res), { 1: 3, 2: 2, 3: 1, 4: 0 });
});

test('empat a la 1a posició: tots dos 3 punts i el següent queda 3r', () => {
  const res = puntuarRonda(100, [
    { playerId: 1, value: 90 }, { playerId: 2, value: 110 }, { playerId: 3, value: 50 },
  ]);
  assert.deepStrictEqual(punts(res), { 1: 3, 2: 3, 3: 1 });
});

test('resposta exacta: +2', () => {
  const res = puntuarRonda(88, [{ playerId: 1, value: 88 }, { playerId: 2, value: 80 }]);
  assert.deepStrictEqual(punts(res), { 1: 5, 2: 2 });
});

test('un sol jugador i ningú responent', () => {
  assert.deepStrictEqual(punts(puntuarRonda(5, [{ playerId: 1, value: 1 }])), { 1: 3 });
  assert.deepStrictEqual(puntuarRonda(5, []), []);
});

test('el slider sempre conté la resposta correcta', () => {
  for (const correcta of [0, 28, 88, 1969, 299792, -273]) {
    for (let i = 0; i < 200; i++) {
      const { min, max } = rangSlider(correcta);
      assert.ok(min <= correcta && correcta <= max, `${correcta} fora de [${min}, ${max}]`);
    }
  }
});
