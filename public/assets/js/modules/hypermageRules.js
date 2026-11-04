// Evidence-based observations from Spanish combat logs, scoped by character.
function createHypermageObservations() {
  return { abundance: null, breeze: null, lastGeneratedRune: null, runes: { fire: null, water: null, air: null, earth: null }, lastBCChange: null, lastElementalCycle: null, cycleUses: null, turn: 0, bcFullSignal: false, lastDamageBack: null, effects: {} };
}

function hyperRuneElement(name) {
  return ({ "incan'runa": "fire", "acua'runa": "water", "aer'runa": "air", "telu'runa": "earth" })[name.toLocaleLowerCase("es")] || null;
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
    next.lastDamageBack = null;
    next.runes = { fire: null, water: null, air: null, earth: null };
    next.lastGeneratedRune = null;
    next.abundance = null;
    return next;
  }
  // Damage lines identify the target but do not reliably identify the attacker.
  if (/^.+?:\s*-\s*[\d.,]+\s*(?:PdV|PV|HP)\b/i.test(content)) {
    next.lastDamageBack = /\b(?:de|por la|por) espalda\b/i.test(content);
  }
  const expired = content.match(/^(.+?): ya no se encuentra bajo el estado ['’](Debilidad[^']*|Luminiscencia)['’]/i);
  if (expired) {
    const key = /^Luminiscencia$/i.test(expired[2]) ? "luminiscencia" : "debilidad";
    next.effects = { ...previous.effects, [expired[1]]: { ...(previous.effects[expired[1]] || {}), [key]: { turn: previous.turn, name: expired[2], active: false } } };
  }
  const effect = content.match(/^(.+?): (Debilidad[^:]*|Luminiscencia) \(Niv\. \d+\)(?: \(([^)]+)\))?/i);
  if (effect && (!/^Luminiscencia$/i.test(effect[2]) || /^Runas consumidas$/i.test(effect[3] || ""))) {
    next.effects = { ...previous.effects, [effect[1]]: { ...(previous.effects[effect[1]] || {}), [/^Luminiscencia$/i.test(effect[2]) ? "luminiscencia" : "debilidad"]: { turn: previous.turn, name: effect[2], active: true } } };
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
  const runeApplied = event.match(/^([^:]+?'runa) \(Niv\.\s*\d+\)/i);
  const runeRemoved = event.match(/^ya no se encuentra bajo el estado ['’]([^]+?'runa)['’]/i);
  const runeName = runeApplied?.[1] || runeRemoved?.[1];
  const element = runeName && hyperRuneElement(runeName);
  if (element) {
    next.runes = { ...previous.runes, [element]: Boolean(runeApplied) };
    if (runeRemoved && previous.lastGeneratedRune === runeName) next.lastGeneratedRune = null;
  }
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
