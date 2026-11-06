// Calcula el rang [min, max] del slider per a una pregunta.
//
// Problema: si el rang fos sempre, p. ex., [0, 2·resposta], el centre del slider
// seria la resposta correcta i els jugadors ho descobririen de seguida.
// Solució: l'amplada i la posició de la resposta dins del rang són aleatòries.
// Així el client sap on pot moure el dit/cursor però no en pot deduir la resposta.

// Arrodoneix a un pas "maco" (1, 2, 5, 10, 20, 50, 100...) perquè el rang no delati la resposta.
function pasMaco(valor) {
  const potencia = 10 ** Math.floor(Math.log10(Math.max(valor, 1)));
  const relatiu = valor / potencia;
  if (relatiu <= 1) return potencia;
  if (relatiu <= 2) return 2 * potencia;
  if (relatiu <= 5) return 5 * potencia;
  return 10 * potencia;
}

function rangSlider(correcta, random = Math.random) {
  const amplada = Math.max(Math.abs(correcta) * (0.8 + random() * 1.7), 20);
  const posicio = 0.1 + random() * 0.8; // on cau la resposta dins del rang (10%–90%)

  const pas = pasMaco(amplada / 20);
  let min = Math.floor((correcta - amplada * posicio) / pas) * pas;
  let max = Math.ceil((correcta + amplada * (1 - posicio)) / pas) * pas;

  // Si la resposta és positiva no té sentit oferir valors negatius.
  if (correcta >= 0 && min < 0) min = 0;
  if (max <= min) max = min + pas;

  return { min, max, step: 1 };
}

module.exports = { rangSlider };
