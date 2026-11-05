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
  for (const [label, value] of [["Portal Celestial - Contador", state.portal], ["Don Celestial", state.don], ["Último recurso de Don Celestial", state.resource]]) {
    const line = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${label}: `;
    line.appendChild(title);
    line.appendChild(document.createTextNode(value || "sin datos observados"));
    selotropDetails.appendChild(line);
  }
  const note = document.createElement("p");
  note.className = "class-note";
  note.textContent = "Últimas señales del registro; no indican necesariamente el estado o la acumulación actuales.";
  selotropDetails.appendChild(note);
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
  const portal = event.match(/^Portal Celestial - Contador\s*\(([^)]+)\)/i);
  const don = event.match(/^Don Celestial\s*\(([^)]+)\)/i);
  const removed = /^ya no se encuentra bajo el estado ['’]Don Celestial['’]/i.test(event);
  const resource = /^[+-]?\d+\s+(?:PA|PM|PW)\s*\(Don Celestial\)/i.test(event);
  if (!portal && !don && !removed && !resource) return;
  const isNew = !selotropObservations[name];
  const state = selotropObservations[name] || (selotropObservations[name] = {});
  if (portal) state.portal = portal[1];
  if (don) state.don = don[1];
  if (removed) state.don = "retirado (última señal)";
  if (resource) state.resource = event;
  if (isNew) syncSelotropSelection();
  else if (!deferRender && name === selotropCharacter.value) renderSelotropObservations();
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

if (classSelector) classSelector.addEventListener("change", updateClassTrackerSelection);
if (selotropCharacter) selotropCharacter.addEventListener("change", renderSelotropObservations);
updateClassTrackerSelection();
