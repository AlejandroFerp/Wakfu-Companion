// Chronological combat events: preserve the game's original text and order.
const combatLogList = document.getElementById("combat-log-list");
const combatLogClear = document.getElementById("combat-log-clear");
const combatLogType = document.getElementById("combat-log-type");
const combatLogSearch = document.getElementById("combat-log-search");
const MAX_COMBAT_LOG_EVENTS = 1000;

function classifyCombatEvent(text) {
  if (/\blanza (?:el hechizo|el sortilegio)\b/i.test(text)) return "cast";
  if (/^.+?:\s*-\s*[\d.,]+\s*(?:PdV|PV|HP)\b/i.test(text)) return "damage";
  if (/^.+?:\s*\+\s*[\d.,]+\s*(?:PdV|PV|HP)\b/i.test(text)) return "heal";
  if (/^.+?:\s*[+-]?\s*[\d.,]+\s*(?:Armadura|Armor|Armure)\b/i.test(text)) return "armor";
  if (/^.+?:\s*[+-]?\s*[\d.,]+\s*(?:PA|PM|PW|PE|Puntos?\s+de\s+Stasis|Punto\(s\)\s+de\s+Stasis)\b/i.test(text)) return "resource";
  if (/^.+?:\s*.+\((?:[+-]?\d+\s*niv\.|niv\.\s*\d+)\)/i.test(text)) return "state";
  return "other";
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
  const atBottom = combatLogList.scrollHeight - combatLogList.scrollTop - combatLogList.clientHeight < 40;
  const empty = combatLogList.querySelector(".empty-state");
  if (empty) empty.remove();
  const row = document.createElement("div");
  row.className = "combat-log-event";
  const type = classifyCombatEvent(match[2]);
  row.dataset.type = type;
  const time = document.createElement("time");
  time.textContent = match[1];
  const message = document.createElement("span");
  message.textContent = match[2];
  const badge = document.createElement("span");
  badge.className = `combat-log-badge combat-log-${type}`;
  badge.textContent = { cast: "Hechizo", damage: "Daño", heal: "Cura", armor: "Armadura", resource: "Recurso", state: "Estado", other: "Evento" }[type];
  row.append(time, badge, message);
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

