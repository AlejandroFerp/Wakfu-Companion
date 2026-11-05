// Chronological combat events: preserve the game's original text and order.
const combatLogList = document.getElementById("combat-log-list");
const combatLogClear = document.getElementById("combat-log-clear");
const combatLogType = document.getElementById("combat-log-type");
const combatLogSearch = document.getElementById("combat-log-search");
const combatSpellImport = document.getElementById("combat-spell-import");
const combatSpellStatus = document.getElementById("combat-spell-status");
const combatIconImport = document.getElementById("combat-icon-import");
const combatIconStatus = document.getElementById("combat-icon-status");
const MAX_COMBAT_LOG_EVENTS = 1000;
const hyperCharacter = document.getElementById("hyper-character");
const hyperPanel = document.getElementById("hyper-observations");
const classTrackerContent = document.getElementById("class-tracker-content");
const classSettingsToggle = document.getElementById("class-settings-toggle");
if (classSettingsToggle && classTrackerContent) classSettingsToggle.addEventListener("click", () => {
  const open = classTrackerContent.classList.toggle("is-configuring");
  classSettingsToggle.setAttribute("aria-expanded", String(open));
});
const hyperChoiceLabel = document.getElementById("hyper-choice-label");
const hyperDetected = document.getElementById("hyper-detected");
const hyperTarget = document.getElementById("hyper-target");
let hyperObserved = createHypermageObservations();

function renderHyperObservations() {
  if (!hyperPanel) return;
  if (!hyperCharacter.value.trim()) {
    classTrackerContent?.classList.remove("is-turn-estimated");
    hyperPanel.textContent = "Esperando a identificar un hipermago por sus hechizos.";
    return;
  }
  const targets = Object.keys(hyperObserved.effects);
  const previousTarget = hyperTarget.value;
  if (hyperTarget.dataset.targets !== JSON.stringify(targets)) {
    hyperTarget.replaceChildren();
    if (!targets.length) hyperTarget.add(new Option("Sin objetivo detectado", ""));
    for (const target of targets) hyperTarget.add(new Option(target, target));
    if (targets.includes(previousTarget)) hyperTarget.value = previousTarget;
    hyperTarget.dataset.targets = JSON.stringify(targets);
  }
  if (hyperTarget.dataset.effectSerial !== String(hyperObserved.effectSerial)) {
    if (hyperObserved.lastEffectTarget && targets.includes(hyperObserved.lastEffectTarget)) hyperTarget.value = hyperObserved.lastEffectTarget;
    hyperTarget.dataset.effectSerial = String(hyperObserved.effectSerial);
  }
  hyperPanel.replaceChildren();
  const card = classTrackerContent;
  if (card) {
    card.classList.toggle("is-turn-estimated", Boolean(hyperObserved.estimatedTurn));
    card.title = hyperObserved.estimatedTurn ? "Turno estimado por el registro, aún sin confirmación visual" : "Turno sin confirmar visualmente";
  }
  const add = (parent, tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; parent.appendChild(el); return el; };
  const runes = add(hyperPanel, "div", "class-runes");
  const last = hyperObserved.lastGeneratedRune && hyperRuneElement(hyperObserved.lastGeneratedRune);
  for (const [element, label] of [["fire", "Fuego"], ["water", "Agua"], ["air", "Aire"], ["earth", "Tierra"]]) {
    const state = hyperObserved.runes[element];
    const rune = add(runes, "div", `class-rune ${state === null ? "is-unknown" : state ? "is-active" : ""} ${last === element ? "is-last" : ""}`);
    rune.title = `${label}: ${state === null ? "estado desconocido" : state ? "runa observada" : "runa retirada"}${last === element ? "; última runa guardada observada" : ""}`;
    const icon = document.createElement("img"); icon.src = new URL(`assets/img/elements/${element}.png`, document.baseURI).href; icon.alt = ""; rune.appendChild(icon);
    rune.setAttribute("aria-label", rune.title);
  }
  const metrics = add(hyperPanel, "div", "class-metrics");
  const metric = (symbol, label, value) => {
    const box = add(metrics, "div", "class-metric");
    box.title = `${label}: ${value}`; box.setAttribute("aria-label", box.title);
    add(box, "span", "class-metric-icon", symbol).setAttribute("aria-hidden", "true");
    add(box, "strong", "class-metric-value", value);
  };
  metric("✺", "Abundancia", hyperObserved.abundance === null ? "—" : `${hyperObserved.abundance}`);
  const cost = nextCycleCost(hyperObserved);
  metric("↻", "Próximo Ciclo Elemental, coste estimado en BC", cost === null ? "—" : cost === "agotado" ? "0/5" : `${cost}`);
  const indicators = add(metrics, "div", "class-effects");
  const observed = hyperObserved.effects[hyperTarget.value] || {};
  for (const [key, label] of [["debilidad", "Debilidad"], ["luminiscencia", "Luminiscencia"]]) {
    const item = observed[key];
    const recent = item && item.active && item.turn > 0 && item.turn === hyperObserved.turn && hyperObserved.estimatedTurn;
    const inactive = item && item.active === false;
    const status = inactive ? "retirado" : recent ? "observado este turno" : item ? "duración desconocida" : "sin información";
    const badge = add(indicators, "span", `class-effect ${recent ? "is-active" : inactive ? "" : "is-unknown"}`);
    badge.textContent = key === "debilidad" ? "✦" : "☼";
    badge.title = `${label}: ${status}${hyperTarget.value ? ` · ${hyperTarget.value}` : ""}. Autor sin confirmar.`;
    badge.setAttribute("aria-label", badge.title);
  }
}
if (hyperTarget) hyperTarget.addEventListener("change", renderHyperObservations);
if (hyperCharacter) hyperCharacter.addEventListener("change", () => {
  hyperObserved = createHypermageObservations();
  renderHyperObservations();
});
function syncHypermageSelection() {
  if (!hyperCharacter || typeof playerClasses === "undefined") return;
  const names = Object.keys(playerClasses).filter(name => playerClasses[name] === "huppermage").sort();
  const previous = hyperCharacter.value;
  const signature = JSON.stringify(names);
  if (hyperCharacter.dataset.candidates !== signature) {
    hyperCharacter.replaceChildren();
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      hyperCharacter.appendChild(option);
    }
    hyperCharacter.dataset.candidates = signature;
    if (names.includes(previous)) hyperCharacter.value = previous;
    if (hyperCharacter.value !== previous) hyperObserved = createHypermageObservations();
    renderHyperObservations();
  }
  hyperChoiceLabel.hidden = names.length < 2;
  hyperDetected.textContent = names.length === 0 ? "Buscando hipermago..." : names.length === 1 ? `Hipermago detectado: ${names[0]}` : "Selecciona el hipermago que quieres seguir.";
}
let combatSpellDescriptions = {};
try { combatSpellDescriptions = JSON.parse(localStorage.getItem("wakfu_local_spell_descriptions") || "{}"); } catch (_) {}

let combatSpellIcons = {};
try { const saved = JSON.parse(localStorage.getItem("wakfu_local_spell_icons") || "{}"); if (saved && typeof saved === "object" && !Array.isArray(saved)) combatSpellIcons = saved; } catch (_) {}

function getCombatSpellDescription(name) {
  const description = combatSpellDescriptions[name];
  return typeof description === "string" ? description : "";
}

function getCombatSpellIcon(name) {
  const icon = combatSpellIcons[name];
  return typeof icon === "string" && icon.length <= 20000 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(icon) ? icon : null;
}

function describeCombatSpell(row, text) {
  const cast = text.match(/^.*? lanza (?:el hechizo|el sortilegio) (.*?)(?:\.(?=$|\s\()|(?=\s\()|$)/i);
  if (!cast) return;
  const name = cast[1].trim();
  const description = getCombatSpellDescription(name);
  row.title = description;
  row.classList.toggle("combat-log-has-description", Boolean(description));
  const oldIcon = row.querySelector(".combat-spell-icon");
  if (oldIcon) oldIcon.remove();
  const source = getCombatSpellIcon(name);
  if (source) {
    const icon = document.createElement("img");
    icon.className = "combat-spell-icon";
    icon.src = source;
    icon.alt = "";
    row.insertBefore(icon, row.querySelector(".combat-log-badge"));
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
    if (typeof renderMeter === "function") { lastRenderSignature = ""; renderMeter(); }
    updateSpellStatus();
  } catch (err) { combatSpellStatus.textContent = `No se pudieron cargar las descripciones: ${err.message}`; }
});
if (combatSpellStatus) updateSpellStatus();

function updateCombatIconStatus() {
  if (!combatIconStatus) return;
  const count = Object.keys(combatSpellIcons).length;
  combatIconStatus.textContent = count ? `${count} iconos locales cargados.` : "Opcional: importa los iconos de tu juego.";
}

if (combatIconImport) combatIconImport.addEventListener("change", async () => {
  const file = combatIconImport.files[0];
  if (!file) return;
  try {
    if (file.size > 5000000) throw new Error("El archivo es demasiado grande.");
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || !data.iconos || typeof data.iconos !== "object" || Array.isArray(data.iconos)) throw new Error("Formato de archivo incorrecto.");
    const clean = Object.create(null);
    for (const [name, icon] of Object.entries(data.iconos)) {
      if (name.length <= 300 && typeof icon === "string" && icon.length <= 20000 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(icon)) clean[name] = icon;
    }
    localStorage.setItem("wakfu_local_spell_icons", JSON.stringify(clean));
    combatSpellIcons = clean;
    for (const row of combatLogList.querySelectorAll('.combat-log-event[data-type="cast"]')) describeCombatSpell(row, row.dataset.message);
    if (typeof renderMeter === "function") { lastRenderSignature = ""; renderMeter(); }
    updateCombatIconStatus();
  } catch (err) { combatIconStatus.textContent = `No se pudieron cargar los iconos: ${err.message}`; }
});
updateCombatIconStatus();

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
  return indicators;
}

function updateCombatLogFilters() {
  const type = combatLogType.value;
  const query = combatLogSearch.value.toLocaleLowerCase("es").trim();
  for (const row of combatLogList.querySelectorAll(".combat-log-event")) {
    row.hidden = (type !== "all" && row.dataset.type !== type) || !row.textContent.toLocaleLowerCase("es").includes(query);
  }
}

let combatLogBatch = null;

function beginCombatLogBatch() {
  if (!combatLogList || combatLogBatch) return;
  combatLogBatch = {
    atBottom: combatLogList.scrollHeight - combatLogList.scrollTop - combatLogList.clientHeight < 40,
    rows: [],
    hyperDirty: false,
  };
}

function endCombatLogBatch() {
  if (!combatLogBatch) return;
  const batch = combatLogBatch;
  combatLogBatch = null;
  const fragment = document.createDocumentFragment();
  for (const row of batch.rows) fragment.appendChild(row);
  combatLogList.appendChild(fragment);
  while (combatLogList.children.length > MAX_COMBAT_LOG_EVENTS) combatLogList.firstElementChild.remove();
  if (batch.atBottom && batch.rows.length) combatLogList.scrollTop = combatLogList.scrollHeight;
  if (batch.hyperDirty) renderHyperObservations();
  if (typeof renderSelotropObservations === "function") renderSelotropObservations();
}

function appendCombatLog(line) {
  const match = line.match(/^(\d{2}:\d{2}:\d{2}),\d+\s+-\s+\[(?:Información \(combate\)|Information \(combat\)|Fight Log|Registro de lutas)\]\s*(.*)$/i);
  if (!match || !combatLogList) return;
  syncHypermageSelection();
  if (typeof observeSelotropLog === "function") observeSelotropLog(line, Boolean(combatLogBatch));
  if (hyperCharacter && hyperCharacter.value.trim()) {
    hyperObserved = observeHypermageLine(hyperObserved, hyperCharacter.value.trim(), line);
    if (combatLogBatch) combatLogBatch.hyperDirty = true;
    else renderHyperObservations();
  }
  const atBottom = !combatLogBatch && combatLogList.scrollHeight - combatLogList.scrollTop - combatLogList.clientHeight < 40;
  const empty = combatLogList.querySelector(".empty-state");
  if (empty) empty.remove();
  const row = document.createElement("div");
  row.className = "combat-log-event";
  const type = classifyCombatEvent(match[2]);
  row.dataset.type = type;
  row.dataset.message = match[2];
  const time = document.createElement("time");
  time.textContent = match[1];
  const message = document.createElement("span");
  message.textContent = match[2];
  const badge = document.createElement("span");
  badge.className = `combat-log-badge combat-log-${type}`;
  badge.textContent = { cast: "Hechizo", damage: "Daño", heal: "Cura", armor: "Armadura", resource: "Recurso", state: "Estado", movement: "Movimiento", summon: "Invocación", other: "Evento" }[type];
  row.append(time, badge);
  if (type === "cast") describeCombatSpell(row, match[2]);
  for (const [symbol, label] of combatEventIndicators(match[2])) {
    const indicator = document.createElement("span");
    indicator.className = "combat-log-indicator";
    indicator.textContent = symbol;
    indicator.title = label;
    indicator.setAttribute("aria-label", label);
    row.appendChild(indicator);
  }
  row.appendChild(message);
  const selectedType = combatLogType.value;
  const query = combatLogSearch.value.toLocaleLowerCase("es").trim();
  row.hidden = (selectedType !== "all" && selectedType !== type) || !row.textContent.toLocaleLowerCase("es").includes(query);
  if (combatLogBatch) {
    combatLogBatch.rows.push(row);
    if (combatLogBatch.rows.length > MAX_COMBAT_LOG_EVENTS) combatLogBatch.rows.shift();
  } else {
    combatLogList.appendChild(row);
    while (combatLogList.children.length > MAX_COMBAT_LOG_EVENTS) combatLogList.firstElementChild.remove();
    if (atBottom) combatLogList.scrollTop = combatLogList.scrollHeight;
  }
}

if (combatLogClear) combatLogClear.addEventListener("click", () => {
  combatLogList.replaceChildren();
});
if (combatLogType) combatLogType.addEventListener("change", updateCombatLogFilters);
if (combatLogSearch) combatLogSearch.addEventListener("input", updateCombatLogFilters);
