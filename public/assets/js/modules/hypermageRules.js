// Evidence-based observations from Spanish combat logs, scoped by character.
function createHypermageObservations() {
  return { abundance: null, breeze: null, lastGeneratedRune: null, lastBCChange: null, lastElementalCycle: null, cycleUses: null, turn: 0, bcFullSignal: false, effects: {} };
}

// Only the user can assert their turn until the log provides a reliable signal.
function startHypermageTurn(previous) {
  return { ...previous, cycleUses: 0, turn: previous.turn + 1 };
}

function nextCycleCost(state) {
  if (state.cycleUses === null) return null;
  return state.cycleUses >= 5 ? "agotado" : state.cycleUses * 50;
}

function observeHypermageLine(previous, character, line) {
  const next = { ...previous };
  const match = line.match(/^\d{2}:\d{2}:\d{2},\d+\s+-\s+\[Información \(combate\)\]\s*(.*)$/i);
  if (!match) return next;
  const content = match[1];
  if (/^Combate terminado\b/i.test(content)) {
    next.cycleUses = null;
    next.effects = {};
    next.bcFullSignal = false;
    return next;
  }
  const effect = content.match(/^(.+?): (Debilidad[^:]*|Luminiscencia) \(Niv\. \d+\)(?: \(([^)]+)\))?/i);
  if (effect && (!/^Luminiscencia$/i.test(effect[2]) || /^Runas consumidas$/i.test(effect[3] || ""))) {
    next.effects = { ...previous.effects, [effect[1]]: { ...(previous.effects[effect[1]] || {}), [/^Luminiscencia$/i.test(effect[2]) ? "luminiscencia" : "debilidad"]: { turn: previous.turn, name: effect[2] } } };
  }
  const prefix = `${character}: `;
  const wispPrefix = `[${character}] Fuego fatuo: Guardado `;
  if (content.startsWith(wispPrefix)) {
    next.lastGeneratedRune = content.slice(wispPrefix.length).trim() || null;
    return next;
  }
  if (content === `${character} lanza el hechizo Ciclo Elemental.` || content.startsWith(`${character} lanza el hechizo Ciclo Elemental. (`)) {
    next.lastElementalCycle = match[0].slice(0, 8);
    if (next.cycleUses !== null) {
      if (next.cycleUses > 0) next.bcFullSignal = false;
      next.cycleUses = Math.min(5, next.cycleUses + 1);
    } else {
      next.bcFullSignal = false;
    }
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
  if (bc) {
    next.lastBCChange = Number(bc[1]);
    if (/^0 BC \((?:Runa generada|Runas consumidas|Generación Natural)\)/i.test(event)) next.bcFullSignal = true;
    else if (Number(bc[1]) !== 0) next.bcFullSignal = false;
  }
  return next;
}

if (typeof module !== "undefined") module.exports = { createHypermageObservations, observeHypermageLine, startHypermageTurn, nextCycleCost };

