// Show only lines observed for each detected Selotrop; the current state is not inferred.
const classSelector = document.getElementById("class-selector");
const hyperClassPanel = document.getElementById("hyper-class-panel");
const selotropPanel = document.getElementById("selotrop-panel");
const selotropCharacter = document.getElementById("selotrop-character");
const selotropStatus = document.getElementById("selotrop-status");
const selotropDetails = document.getElementById("selotrop-observations");
let selotropObservations = Object.create(null);

function renderSelotropObservations() {
  if (!selotropDetails || !selotropCharacter) return;
  const name = selotropCharacter.value;
  const state = selotropObservations[name] || {};
  selotropDetails.replaceChildren();
  if (!name) {
    selotropDetails.textContent = "Esperando a identificar un selotrop por sus hechizos.";
    return;
  }
  const icon = document.createElement("img");
  icon.src = new URL("assets/img/class-icons/portal-celestial.png", document.baseURI).href;
  icon.alt = "Portal Celestial";
  icon.className = `selotrop-portal-icon ${state.celestial ? "is-observed" : "is-unknown"}`;
  icon.title = !state.celestial ? "Portal Celestial: sin observar" : state.celestial.expired ? "Portal Celestial: reaplicar" : "Portal Celestial observado; duración sin confirmar";
  if (state.celestial?.expired) icon.classList.add("is-expired");
  selotropDetails.appendChild(icon);
}

function syncSelotropSelection() {
  if (!selotropCharacter || typeof playerClasses === "undefined") return;
  const names = [...new Set([
    ...Object.keys(playerClasses).filter((name) => playerClasses[name] === "eliotrope"),
    ...Object.keys(selotropObservations),
  ])].sort();
  const previous = selotropCharacter.value;
  const signature = JSON.stringify(names);
  if (selotropCharacter.dataset.candidates !== signature) {
    selotropCharacter.replaceChildren();
    if (!names.length) selotropCharacter.add(new Option("Sin selotrop detectado", ""));
    for (const name of names) selotropCharacter.add(new Option(name, name));
    if (names.includes(previous)) selotropCharacter.value = previous;
    selotropCharacter.dataset.candidates = signature;
  }
  selotropStatus.textContent = names.length ? `${names.length} personaje(s) detectado(s)` : "Buscando señales del selotrop...";
  renderSelotropObservations();
}

function observeSelotropLog(line, deferRender = false) {
  const match = line.match(/^\d{2}:\d{2}:\d{2},\d+\s+-\s+\[Información \(combate\)\]\s*(.*)$/i);
  if (!match) return;
  const content = match[1];
  if (/^(?:Combate terminado|El combate ha terminado)\b/i.test(content)) {
    selotropObservations = Object.create(null);
    syncSelotropSelection();
    return;
  }
  const separator = content.indexOf(": ");
  if (separator < 1) return;
  const name = content.slice(0, separator);
  const event = content.slice(separator + 2);
  const celestial = /^Portal Celestial\s*\(Niv\.\s*\d+\)/i.test(event);
  const celestialRemoved = /^ya no se encuentra bajo el estado ['’]Portal Celestial['’]/i.test(event);
  const portal = event.match(/^Portal Celestial - Contador\s*\(([^)]+)\)/i);
  const don = event.match(/^Don Celestial\s*\(([^)]+)\)/i);
  const removed = /^ya no se encuentra bajo el estado ['’]Don Celestial['’]/i.test(event);
  const resource = /^[+-]?\d+\s+(?:PA|PM|PW)\s*\(Don Celestial\)/i.test(event);
  if (!celestial && !celestialRemoved && !portal && !don && !removed && !resource) return;
  const isNew = !selotropObservations[name];
  const state = selotropObservations[name] || (selotropObservations[name] = {});
  if (celestial) {
    const t = line.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    const ms = t ? (((+t[1] * 60 + +t[2]) * 60 + +t[3]) * 1000 + +t[4]) : null;
    const delta = ms !== null && state.celestial?.appliedAt !== null && state.celestial?.appliedAt !== undefined ? (ms - state.celestial.appliedAt + 86400000) % 86400000 : null;
    if (delta === null || delta > 200) state.celestial = { appliedAt: ms, confirmedEnds: 0, expired: false };
  }
  if (celestialRemoved && state.celestial) state.celestial.expired = true;
  if (portal) state.portal = portal[1];
  if (don) state.don = don[1];
  if (removed) state.don = "retirado (última señal)";
  if (resource) state.resource = event;
  if (isNew) syncSelotropSelection();
  else if (!deferRender && name === selotropCharacter.value) renderSelotropObservations();
}

// Call only from a source that identifies whose turn actually ended.
function recordConfirmedSelotropTurnEnd(name) {
  const state = selotropObservations[name]?.celestial;
  if (!state || state.expired) return;
  state.confirmedEnds = Math.min(2, state.confirmedEnds + 1);
  if (state.confirmedEnds >= 2) state.expired = true;
  if (name === selotropCharacter.value) renderSelotropObservations();
}

function resetSelotropObservations() {
  selotropObservations = Object.create(null);
  syncSelotropSelection();
}

function updateClassTrackerSelection() {
  if (!classSelector || !hyperClassPanel || !selotropPanel) return;
  hyperClassPanel.hidden = classSelector.value !== "huppermage";
  selotropPanel.hidden = classSelector.value !== "eliotrope";
  if (!selotropPanel.hidden) syncSelotropSelection();
}

if (classSelector) {
  try {
    const savedClass = localStorage.getItem("wakfu_class_tracker");
    if (["huppermage", "eliotrope"].includes(savedClass)) classSelector.value = savedClass;
  } catch (_) {}
  classSelector.addEventListener("change", () => {
    try { localStorage.setItem("wakfu_class_tracker", classSelector.value); } catch (_) {}
    updateClassTrackerSelection();
  });
}
if (selotropCharacter) selotropCharacter.addEventListener("change", renderSelotropObservations);
updateClassTrackerSelection();
