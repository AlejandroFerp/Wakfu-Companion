// Chronological combat events: preserve the game's original text and order.
const combatLogList = document.getElementById("combat-log-list");
const combatLogClear = document.getElementById("combat-log-clear");
const combatLogType = document.getElementById("combat-log-type");
const combatLogSearch = document.getElementById("combat-log-search");
const combatSpellImport = document.getElementById("combat-spell-import");
const combatSpellStatus = document.getElementById("combat-spell-status");
const MAX_COMBAT_LOG_EVENTS = 1000;
const hyperCharacter = document.getElementById("hyper-character");
const hyperPanel = document.getElementById("hyper-observations");
const hyperStartTurn = document.getElementById("hyper-start-turn");
let hyperObserved = createHypermageObservations();

function renderHyperObservations() {
  if (!hyperPanel) return;
  if (!hyperCharacter.value.trim()) {
    hyperPanel.textContent = "Escribe el nombre de tu hipermago para seguir los eventos.";
    return;
  }
  const value = v => v === null ? "sin observar" : String(v);
  const cost = nextCycleCost(hyperObserved);
  const cycle = cost === null ? "marca el inicio de tu turno" : cost === "agotado" ? "sin usos (5/5)" : `${cost} BC (${hyperObserved.cycleUses}/5 usos)`;
  const effects = Object.entries(hyperObserved.effects).map(([target, states]) => {
    const describe = entry => !entry ? "no observado" : entry.turn === 0 ? "observado; duración desconocida" : entry.turn === hyperObserved.turn ? "observado este turno" : "observado en turno anterior; comprobar";
    return `${target}: Debilidad ${describe(states.debilidad)}; Luminiscencia ${describe(states.luminiscencia)}`;
  });
  hyperPanel.textContent = `Último observado · Abundancia: ${value(hyperObserved.abundance)} · Brisa: ${value(hyperObserved.breeze)} · Última runa guardada: ${value(hyperObserved.lastGeneratedRune)} · Último evento de BC: ${value(hyperObserved.lastBCChange)} · ${hyperObserved.bcFullSignal ? "BC lleno en la última señal · " : ""}Próximo Ciclo: ${cycle}${effects.length ? ` · Estados detectados (autor sin confirmar): ${effects.join(" | ")}` : ""}`;
}
if (hyperStartTurn) hyperStartTurn.addEventListener("click", () => {
  if (!hyperCharacter.value.trim()) return;
  hyperObserved = startHypermageTurn(hyperObserved);
  renderHyperObservations();
});
if (hyperCharacter) hyperCharacter.addEventListener("input", () => {
  hyperObserved = createHypermageObservations();
  renderHyperObservations();
});
let combatSpellDescriptions = {};
try { combatSpellDescriptions = JSON.parse(localStorage.getItem("wakfu_local_spell_descriptions") || "{}"); } catch (_) {}

function describeCombatSpell(row, text) {
  const cast = text.match(/^.*? lanza (?:el hechizo|el sortilegio) (.*?)(?:\.(?=$|\s\()|(?=\s\()|$)/i);
  if (!cast) return;
  const description = combatSpellDescriptions[cast[1].trim()];
  if (typeof description === "string" && description) {
    row.title = description;
    row.classList.add("combat-log-has-description");
  }
}

function updateSpellStatus() {
  const count = Object.keys(combatSpellDescriptions).length;
  combatSpellStatus.textContent = count ? `${count} descripciones locales cargadas. Pasa el ratón por un hechizo.` : "Opcional: importa las descripciones de tu juego.";
}

if (combatSpellImport) combatSpellImport.addEventListener("change", async () => {
  const file = combatSpellImport.files[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error("El archivo es demasiado grande.");
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || !data.hechizos || typeof data.hechizos !== "object" || Array.isArray(data.hechizos)) throw new Error("Formato de archivo incorrecto.");
    const clean = Object.create(null);
    for (const [name, description] of Object.entries(data.hechizos)) {
      if (typeof description === "string" && name.length <= 300 && description.length <= 10000) clean[name] = description;
    }
    localStorage.setItem("wakfu_local_spell_descriptions", JSON.stringify(clean));
    combatSpellDescriptions = clean;
    for (const row of combatLogList.querySelectorAll('.combat-log-event[data-type="cast"]')) describeCombatSpell(row, row.dataset.message);
    updateSpellStatus();
  } catch (err) { combatSpellStatus.textContent = `No se pudieron cargar las descripciones: ${err.message}`; }
});
if (combatSpellStatus) updateSpellStatus();

function classifyCombatEvent(text) {
  if (/\blanza (?:el hechizo|el sortilegio)\b/i.test(text)) return "cast";
  if (/^.+?:\s*-\s*[\d.,]+\s*(?:PdV|PV|HP)\b/i.test(text)) return "damage";
  if (/^.+?:\s*\+\s*[\d.,]+\s*(?:PdV|PV|HP)\b/i.test(text)) return "heal";
  if (/^.+?:\s*[+-]?\s*[\d.,]+\s*(?:Armadura|Armor|Armure)\b/i.test(text)) return "armor";
  if (/^.+?:\s*[+-]?\s*[\d.,]+\s*(?:PA|PM|PW|PE|BC|Puntos?\s+de\s+Stasis|Punto\(s\)\s+de\s+Stasis)\b/i.test(text)) return "resource";
  if (/^.+?:\s*(?:es empujad[oa]|es atra[ií]d[oa]|se desplaza|cambia de posici[oó]n|se teletransporta)\b/i.test(text)) return "movement";
  if (/^.+?:\s*invoca\b/i.test(text)) return "summon";
  if (/^.+?:\s*.+\((?:[+-]?\d+\s*niv\.|niv\.\s*\d+)\)/i.test(text)) return "state";
  return "other";
}

function combatEventIndicators(text) {
  const indicators = [];
  if (/\bcr[ií]tico\b/i.test(text)) indicators.push(["✦", "Crítico"]);
  if (/\b(?:de|por la|por) espalda\b/i.test(text)) indicators.push(["↶", "Espalda"]);
  return indicators;
}

function updateCombatLogFilters() {
  const type = combatLogType.value;
  const query = combatLogSearch.value.toLocaleLowerCase("es").trim();
  for (const row of combatLogList.querySelectorAll(".combat-log-event")) {
    row.hidden = (type !== "all" && row.dataset.type !== type) || !row.textContent.toLocaleLowerCase("es").includes(query);
  }
}

function appendCombatLog(line) {
  const match = line.match(/^(\d{2}:\d{2}:\d{2}),\d+\s+-\s+\[(?:Información \(combate\)|Information \(combat\)|Fight Log|Registro de lutas)\]\s*(.*)$/i);
  if (!match || !combatLogList) return;
  if (hyperCharacter && hyperCharacter.value.trim()) {
    hyperObserved = observeHypermageLine(hyperObserved, hyperCharacter.value.trim(), line);
    renderHyperObservations();
  }
  const atBottom = combatLogList.scrollHeight - combatLogList.scrollTop - combatLogList.clientHeight < 40;
  const empty = combatLogList.querySelector(".empty-state");
  if (empty) empty.remove();
  const row = document.createElement("div");
  row.className = "combat-log-event";
  const type = classifyCombatEvent(match[2]);
  row.dataset.type = type;
  row.dataset.message = match[2];
  if (type === "cast") describeCombatSpell(row, match[2]);
  const time = document.createElement("time");
  time.textContent = match[1];
  const message = document.createElement("span");
  message.textContent = match[2];
  const badge = document.createElement("span");
  badge.className = `combat-log-badge combat-log-${type}`;
  badge.textContent = { cast: "Hechizo", damage: "Daño", heal: "Cura", armor: "Armadura", resource: "Recurso", state: "Estado", movement: "Movimiento", summon: "Invocación", other: "Evento" }[type];
  row.append(time, badge);
  for (const [symbol, label] of combatEventIndicators(match[2])) {
    const indicator = document.createElement("span");
    indicator.className = "combat-log-indicator";
    indicator.textContent = symbol;
    indicator.title = label;
    indicator.setAttribute("aria-label", label);
    row.appendChild(indicator);
  }
  row.appendChild(message);
  combatLogList.appendChild(row);
  const selectedType = combatLogType.value;
  const query = combatLogSearch.value.toLocaleLowerCase("es").trim();
  row.hidden = (selectedType !== "all" && selectedType !== type) || !row.textContent.toLocaleLowerCase("es").includes(query);
  while (combatLogList.children.length > MAX_COMBAT_LOG_EVENTS) combatLogList.firstElementChild.remove();
  if (atBottom) combatLogList.scrollTop = combatLogList.scrollHeight;
}

if (combatLogClear) combatLogClear.addEventListener("click", () => {
  combatLogList.replaceChildren();
});
if (combatLogType) combatLogType.addEventListener("change", updateCombatLogFilters);
if (combatLogSearch) combatLogSearch.addEventListener("input", updateCombatLogFilters);

