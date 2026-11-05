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
  const names = Object.keys(playerClasses).filter((name) => playerClasses[name] === "eliotrope").sort();
  const previous = selotropCharacter.value;
  const signature = JSON.stringify(names);
  if (selotropCharacter.dataset.candidates !== signature) {
    selotropCharacter.replaceChildren();
    if (!names.length) selotropCharacter.add(new Option("Sin selotrop detectado", ""));
    for (const name of names) selotropCharacter.add(new Option(name, name));
    if (names.includes(previous)) selotropCharacter.value = previous;
    selotropCharacter.dataset.candidates = signature;
  }
  selotropStatus.textContent = names.length ? `${names.length} selotrop(s) detectado(s)` : "Buscando selotrop...";
  renderSelotropObservations();
}

function observeSelotropLog(line, deferRender = false) {
  const match = line.match(/^\d{2}:\d{2}:\d{2},\d+\s+-\s+\[Información \(combate\)\]\s*(.*)$/i);
  if (!match) return;
  const content = match[1];
  if (/^(?:Combate terminado|El combate ha terminado)\b/i.test(content)) {
    selotropObservations = Object.create(null);
    if (!deferRender) renderSelotropObservations();
    return;
  }
  for (const name of Object.keys(playerClasses).filter((item) => playerClasses[item] === "eliotrope")) {
    const prefix = `${name}: `;
    if (!content.startsWith(prefix)) continue;
    const event = content.slice(prefix.length);
    const state = selotropObservations[name] || (selotropObservations[name] = {});
    let observed = event.match(/^Portal Celestial - Contador\s*\(([^)]+)\)/i);
    if (observed) state.portal = observed[1];
    observed = event.match(/^Don Celestial\s*\(([^)]+)\)/i);
    if (observed) state.don = observed[1];
    if (/^ya no se encuentra bajo el estado ['’]Don Celestial['’]/i.test(event)) state.don = "retirado (última señal)";
    if (/^[+-]?\d+\s+(?:PA|PM|PW)\s*\(Don Celestial\)/i.test(event)) state.resource = event;
    if (!deferRender && name === selotropCharacter.value) renderSelotropObservations();
  }
}

function resetSelotropObservations() {
  selotropObservations = Object.create(null);
  renderSelotropObservations();
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
