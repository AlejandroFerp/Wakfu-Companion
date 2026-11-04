// Evidence-based observations from Spanish combat logs, scoped by character.
function createHypermageObservations() {
  return { abundance: null, breeze: null, lastGeneratedRune: null, lastBCChange: null, lastElementalCycle: null };
}

function observeHypermageLine(previous, character, line) {
  const next = { ...previous };
  const match = line.match(/^\d{2}:\d{2}:\d{2},\d+\s+-\s+\[Información \(combate\)\]\s*(.*)$/i);
  if (!match) return next;
  const content = match[1];
  const prefix = `${character}: `;
  const wispPrefix = `[${character}] Fuego fatuo: Guardado `;
  if (content.startsWith(wispPrefix)) {
    next.lastGeneratedRune = content.slice(wispPrefix.length).trim() || null;
    return next;
  }
  if (content === `${character} lanza el hechizo Ciclo Elemental.` || content.startsWith(`${character} lanza el hechizo Ciclo Elemental. (`)) {
    next.lastElementalCycle = match[0].slice(0, 8);
    return next;
  }
  if (!content.startsWith(prefix)) return next;
  const event = content.slice(prefix.length);
  let state = event.match(/^Abundancia \(\+?(\d+) niv\.\)/i);
  if (state) next.abundance = Number(state[1]);
  else if (/^Consume Abundancia\b/i.test(event)) next.abundance = null;
  state = event.match(/^Brisa Cuadramental Almacenada \(\+?(\d+) niv\.\)/i);
  if (state) next.breeze = Number(state[1]);
  else if (/^ya no se encuentra bajo el estado ['’]Brisa Cuadramental Almacenada['’]/i.test(event)) next.breeze = null;
  const bc = event.match(/^([+-]?\d+) BC(?:\s|$|\()/i);
  if (bc) next.lastBCChange = Number(bc[1]);
  return next;
}

if (typeof module !== "undefined") module.exports = { createHypermageObservations, observeHypermageLine };

