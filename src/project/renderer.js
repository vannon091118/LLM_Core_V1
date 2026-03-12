import { CITY_DISTRICTS, CITY_ROADS, findDistrict, neighborsOpen } from "./city.map.js";
import { DISTRICT_LOOT_CONTAINERS, itemById, lootContainerById } from "./inventory.module.js";
import { DISTRICT_PROFILE } from "./districts.module.js";
import { gameModeFromState } from "./game.mode.js";

const KEY_IDS = [11, 12, 21];

function itemInstanceId(item, index = 0) {
  const explicit = typeof item?.instanceId === "string" ? item.instanceId.trim() : "";
  if (explicit) return explicit;
  const baseId = Number.isFinite(item?.id) ? item.id : 0;
  return `legacy_${baseId}_${Math.max(0, index | 0)}`;
}

export function districtRiskValue(profile, districtId = 0) {
  const explicitRisk = Number(profile?.risk);
  if (Number.isFinite(explicitRisk)) return Math.max(0, Math.trunc(explicitRisk));
  const legacyDanger = Number(profile?.danger);
  if (Number.isFinite(legacyDanger)) return Math.max(0, Math.trunc(legacyDanger));
  return Math.max(0, Math.floor(Number(districtId) * 1.5));
}

export function interventionDisabledReason(state, kind, cost, baseDisabled, baseReason = "") {
  if (baseDisabled) return baseReason || "Aktion aktuell gesperrt.";
  if (kind === "TRIGGER_RAID" && state?.app?.featureFlags?.enableRaidIntervention === false) {
    return "Im aktiven Release-Profil deaktiviert.";
  }
  const influence = Number(state?.game?.substrate?.influence || 0);
  if (influence < cost) return "Zu wenig Einfluss.";
  return "";
}

function mk(tag, attrs = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  return node;
}

function paintDoomscape(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#160f12");
  sky.addColorStop(0.5, "#3f1f1f");
  sky.addColorStop(1, "#090b0f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,132,74,0.12)";
  for (let i = 0; i < 28; i++) {
    const x = (i * 43) % w;
    const y = h - (i % 6) * 18 - 28;
    ctx.fillRect(x, y, 28, 18);
  }

  ctx.strokeStyle = "rgba(255,146,96,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(w * 0.24, h * 0.58);
  ctx.lineTo(w * 0.38, h * 0.66);
  ctx.lineTo(w * 0.6, h * 0.6);
  ctx.lineTo(w * 0.82, h * 0.68);
  ctx.lineTo(w, h * 0.61);
  ctx.stroke();

  ctx.fillStyle = "#ffd8c2";
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillText("SIEGE OF DUST", 26, 48);
  ctx.font = "13px Georgia, serif";
  ctx.fillText("Beta Build // Last Safe Frequency", 26, 74);
}

function paintRuleSigil(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#120d12";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,114,69,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.18);
  ctx.lineTo(w * 0.82, h * 0.78);
  ctx.lineTo(w * 0.18, h * 0.78);
  ctx.closePath();
  ctx.stroke();
}

function paintItemCard(canvas, item) {
  if (!canvas || !item) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#171115");
  bg.addColorStop(1, "#2c1714");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#945244";
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = "#ffd5b9";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(item.name, 14, 26);
  ctx.font = "12px sans-serif";
  ctx.fillText(item.kind, 14, 46);
  ctx.fillText(item.effect, 14, 64);
}

function districtAt(canvas, px, py) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = ((px - rect.left) / rect.width) * canvas.width;
  const y = ((py - rect.top) / rect.height) * canvas.height;
  for (const d of CITY_DISTRICTS) {
    const dx = d.x * canvas.width;
    const dy = d.y * canvas.height;
    const rx = Math.max(30, Math.min(60, canvas.width * 0.05));
    const ry = Math.max(20, Math.min(44, canvas.height * 0.05));
    const nx = (x - dx) / rx;
    const ny = (y - dy) / ry;
    if (nx * nx + ny * ny <= 1) return d;
  }
  return null;
}

function paintCityMap(canvas, state, hoveredDistrictId = -1, frame = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#272b2f");
  bg.addColorStop(1, "#181b1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle animated fog/scan layer for movement feeling without random sources.
  for (let i = 0; i < 12; i++) {
    const y = ((i * 31 + frame * 2) % (h + 24)) - 12;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
    ctx.fillRect(0, y, w, 8);
  }

  for (const road of CITY_ROADS) {
    const a = findDistrict(road.a);
    const b = findDistrict(road.b);
    if (!a || !b) continue;
    const ax = Math.floor(a.x * w);
    const ay = Math.floor(a.y * h);
    const bx = Math.floor(b.x * w);
    const by = Math.floor(b.y * h);
    ctx.lineCap = "round";
    ctx.lineWidth = 8;
    ctx.strokeStyle = road.blocked ? "#4d2e2c" : "#7b7f85";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    if (road.blocked) {
      const mx = Math.floor((ax + bx) / 2);
      const my = Math.floor((ay + by) / 2);
      ctx.strokeStyle = "#f06a47";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 7, my - 7);
      ctx.lineTo(mx + 7, my + 7);
      ctx.moveTo(mx + 7, my - 7);
      ctx.lineTo(mx - 7, my + 7);
      ctx.stroke();
    }
  }

  for (const d of CITY_DISTRICTS) {
    const x = Math.floor(d.x * w);
    const y = Math.floor(d.y * h);
    const isCurrent = d.id === state.game.playerDistrict;
    const isHovered = d.id === hoveredDistrictId;
    ctx.fillStyle = isCurrent ? "#4a3b37" : "#343a41";
    ctx.fillRect(x - 30, y - 18, 60, 36);
    ctx.strokeStyle = isHovered ? "#ffb68f" : "#a4aab1";
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.strokeRect(x - 30, y - 18, 60, 36);
    ctx.fillStyle = "#e0dfdd";
    ctx.font = "11px sans-serif";
    ctx.fillText(d.name, x - 27, y - 24);
  }

  let px = 0;
  let py = 0;
  if (state.game.transit.active) {
    const from = findDistrict(state.game.transit.from);
    const to = findDistrict(state.game.transit.to);
    const t = Math.max(0, Math.min(1, state.game.transit.progress / 100));
    px = Math.floor(((from?.x ?? 0) + ((to?.x ?? 0) - (from?.x ?? 0)) * t) * w);
    py = Math.floor(((from?.y ?? 0) + ((to?.y ?? 0) - (from?.y ?? 0)) * t) * h);
  } else {
    const cur = findDistrict(state.game.playerDistrict);
    px = Math.floor((cur?.x ?? 0.1) * w);
    py = Math.floor((cur?.y ?? 0.1) * h);
  }
  ctx.fillStyle = "#ff7a48";
  ctx.beginPath();
  const pulse = 6 + ((frame % 6) * 0.35);
  ctx.arc(px, py, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,161,124,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, pulse + 5, 0, Math.PI * 2);
  ctx.stroke();
}

function lifeBar(current, max, label, key = "") {
  const wrap = mk("div", { class: "life-wrap" });
  if (key) wrap.setAttribute("data-stat-key", key);
  wrap.appendChild(mk("div", { class: "life-label", text: `${label}: ${current}/${max}` }));
  const track = mk("div", { class: "life-track" });
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  const fill = mk("div", { class: "life-fill", style: `width:${pct}%` });
  track.appendChild(fill);
  wrap.appendChild(track);
  return wrap;
}

function applyDisabledState(btn, reason = "") {
  btn.setAttribute("disabled", "true");
  if (reason) {
    btn.setAttribute("data-disabled-reason", reason);
    btn.setAttribute("title", reason);
  }
}

function actionCard(choice, title, lore, cost, gain, risk, disabled, disabledReason = "", opts = {}) {
  const primary = !!opts.primary;
  const recommended = !!opts.recommended;
  const card = mk("button", {
    class: `decision-card${primary ? " primary" : " secondary"}`,
    "data-choice": choice,
    type: "button"
  });
  if (recommended) card.setAttribute("data-recommended", "1");
  if (disabled) applyDisabledState(card, disabledReason);
  if (recommended) {
    card.appendChild(mk("span", { class: "decision-badge", text: "Empfohlen" }));
  }
  card.append(
    mk("span", { class: "decision-title", text: title }),
    mk("span", { class: "decision-flavor", text: lore }),
    mk("span", { class: "decision-meta", text: `Kosten: ${cost}` }),
    mk("span", { class: "decision-meta", text: `Gewinn: ${gain}` }),
    mk("span", { class: "decision-risk", text: `Risiko: ${risk}` })
  );
  return card;
}

function encounterOptionButton(option, primary = false) {
  const btn = mk("button", {
    class: `btn ${primary ? "" : "ghost"} encounter-option${primary ? " primary" : " secondary"}`,
    "data-resolve-option": option.id,
    "data-resolve-mode": option.mode,
    type: "button"
  });
  if (primary) btn.appendChild(mk("span", { class: "decision-badge", text: "Primär" }));
  btn.append(
    mk("span", { class: "enc-opt-title", text: option.label }),
    mk("span", { class: "enc-opt-meta", text: `Kosten ${option.costText} // Gewinn ${option.gainText}` }),
    mk("span", { class: "enc-opt-risk", text: `Risiko: ${option.riskText}` })
  );
  return btn;
}

function decisionCard(choice, title, cost, gain, risk, disabled) {
  const card = mk("button", { class: "decision-card", "data-choice": choice, type: "button" });
  if (disabled) card.setAttribute("disabled", "true");
  card.append(
    mk("span", { class: "decision-title", text: title }),
    mk("span", { class: "decision-meta", text: `Kosten: ${cost}` }),
    mk("span", { class: "decision-meta", text: `Gewinn: ${gain}` }),
    mk("span", { class: "decision-risk", text: `Risiko: ${risk}` })
  );
  return card;
}

function loadoutCard(loadoutId, name, text, selected) {
  const btn = mk("button", {
    class: `loadout-card${selected ? " selected" : ""}`,
    "data-loadout-id": String(loadoutId),
    type: "button"
  });
  btn.append(mk("span", { class: "loadout-name", text: name }), mk("span", { class: "loadout-text", text }));
  return btn;
}

function buildMainMenu(state) {
  const card = mk("section", { class: "card" });
  card.append(mk("h1", { text: state.ui.title }), mk("p", { class: "sub", text: "Main Menu // Dead Zone" }));

  const hero = mk("div", { class: "hero" });
  const c = mk("canvas", { class: "hero-canvas", width: "900", height: "260" });
  hero.append(c);
  card.append(hero);

  card.append(mk("p", { class: "sub", text: "Regeln lesen, Archetyp waehlen, dann startet der Dialog." }));
  card.append(mk("button", { "data-action": "start", class: "btn", text: "Deploy" }));

  paintDoomscape(c);
  return card;
}

function buildLoadoutSelection(state) {
  const card = mk("section", { class: "card" });
  card.append(
    mk("h1", { text: "Choose Your Path" }),
    mk("p", { class: "sub", text: "Waehle einen Archetyp. Danach startet der Intro-Dialog." })
  );
  const selectedLoadoutId = state.game.archetype;
  const loadoutGrid = mk("div", { class: "loadout-grid" });
  loadoutGrid.append(
    loadoutCard("SCAVENGER", "Scavenger", "HP 8 / Supplies 7 / Morale 5 // Trait: Scout-Loot Bonus", selectedLoadoutId === "SCAVENGER"),
    loadoutCard("FIGHTER", "Fighter", "HP 12 / Supplies 4 / Morale 4 // Trait: Retreat mit Supplies", selectedLoadoutId === "FIGHTER"),
    loadoutCard("SURVIVOR", "Survivor", "HP 10 / Supplies 6 / Morale 6 // Trait: langsamere Morale-Decay", selectedLoadoutId === "SURVIVOR")
  );
  card.append(loadoutGrid);
  card.append(mk("button", { "data-action": "menu", class: "btn ghost", text: "Back" }));
  return card;
}

function buildRules(state) {
  const card = mk("section", { class: "card" });
  card.append(mk("h1", { text: state.ui.title }), mk("p", { class: "sub", text: "Main Menu // Dead Zone" }));
  const hero = mk("div", { class: "hero rules-hero" });
  const c = mk("canvas", { class: "hero-canvas", width: "900", height: "190" });
  hero.append(c, mk("div", { class: "bvas", text: "BVAS STATUS: AKTIV" }));
  card.append(hero);
  paintRuleSigil(c);

  const list = mk("ol", { class: "rule-list" });
  list.append(
    mk("li", { text: "REGEL 1: SURVIVE" }),
    mk("li", { text: "REGEL 2: TRAUE NIEMANDEM" }),
    mk("li", { text: "REGEL 3: ENTSCHEIDUNGEN BLEIBEN FUER IMMER" })
  );
  card.append(list, mk("button", { "data-action": "accept-rules", class: "btn", text: "Weiter" }));
  return card;
}

function buildDialog(state) {
  const card = mk("section", { class: "card" });
  const dialogBox = mk("div", { class: "dialog-box" });
  dialogBox.appendChild(mk("p", { class: "dialog-line", "data-dialog-line": "1" }));
  card.append(
    mk("h1", { text: state.ui.title }),
    mk("p", { class: "sub", text: "Funkkanal // Rauschen im Staub" }),
    dialogBox,
    mk("button", { "data-action": "next-dialog", class: "btn", text: "Verstanden" })
  );
  return card;
}

function buildTopBar(state) {
  const cur = findDistrict(state.game.playerDistrict);
  const wrap = mk("section", { class: "hud-shell" });
  const core = mk("div", { class: "hud-core" });

  function hudStat(label, valueText, value, max, dangerAt) {
    const node = mk("article", { class: "hud-stat" });
    if (value <= dangerAt) node.classList.add("danger");
    const meter = mk("div", { class: "hud-meter" });
    const fill = mk("div", { class: "hud-meter-fill", style: `width:${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%` });
    meter.appendChild(fill);
    node.append(mk("p", { class: "hud-label", text: label }), mk("p", { class: "hud-value", text: valueText }), meter);
    return node;
  }

  core.append(
    hudStat("Leben", `${state.game.hp}/${state.game.maxHp}`, state.game.hp, state.game.maxHp, Math.max(2, Math.floor(state.game.maxHp * 0.3))),
    hudStat("Vorrat", `${state.game.supplies}/15`, state.game.supplies, 15, 3),
    hudStat("Moral", `${state.game.morale}/10`, state.game.morale, 10, 3),
    hudStat("Einfluss", `${state.game.substrate.influence}/${state.game.substrate.influenceMax}`, state.game.substrate.influence, state.game.substrate.influenceMax, 2),
    (() => {
      const round = mk("article", { class: "hud-stat compact" });
      round.append(mk("p", { class: "hud-label", text: "Runde" }), mk("p", { class: "hud-value", text: String(state.game.round) }));
      return round;
    })(),
    (() => {
      const place = mk("article", { class: "hud-stat compact" });
      place.append(mk("p", { class: "hud-label", text: "Ort" }), mk("p", { class: "hud-value", text: cur?.name ?? "Unbekannt" }));
      return place;
    })()
  );
  wrap.appendChild(core);
  return wrap;
}

function contextTone(state) {
  if (state.game.over) return { label: "Lage: beendet", cls: "neutral" };
  if (state.game.combat.active) return { label: "Lage: Gefecht", cls: "danger" };
  if (state.game.encounter.active) return { label: "Lage: Kontakt", cls: "warn" };
  if (state.game.transit.active) return { label: "Lage: Marsch", cls: "neutral" };
  if (state.game.supplies <= 3 || state.game.hp <= 3 || state.game.morale <= 3) return { label: "Lage: kritisch", cls: "danger" };
  return { label: "Lage: stabil", cls: "good" };
}

function objectiveLine(state) {
  const ids = new Set(state.game.inventory.items.map((it) => it.id));
  const keys = KEY_IDS.filter((id) => ids.has(id)).length;
  if (keys < 3) return `Fluchtpfad: Sammle Schluesselteile (${keys}/3).`;
  if (state.game.playerDistrict !== 4) return "Fluchtpfad: Bewege dich nach Aschekreuz.";
  return "Fluchtpfad: Signalfenster verfuegbar. Halte die Linie.";
}

function keyItemNames(state) {
  const owned = KEY_IDS
    .map((id) => state.game.inventory.items.find((it) => it.id === id))
    .filter(Boolean)
    .map((it) => it.name);
  return owned.length ? owned.join(", ") : "keine";
}

function buildMissionProgress(state) {
  const ids = new Set(state.game.inventory.items.map((it) => it.id));
  const keys = KEY_IDS.filter((id) => ids.has(id)).length;
  const survival = Math.max(0, Math.min(100, Math.floor((state.game.round / 30) * 100)));
  const warlord = Math.max(0, Math.min(100, Math.floor((state.game.stats.combatsWon / 10) * 100)));
  const escape = Math.max(0, Math.min(100, Math.floor((keys / 3) * 100)));

  function track(label, valueText, pct) {
    const row = mk("div", { class: "mission-row" });
    row.append(
      mk("span", { class: "mission-label", text: label }),
      mk("span", { class: "mission-value", text: valueText })
    );
    const bar = mk("div", { class: "mission-track" });
    bar.appendChild(mk("div", { class: "mission-fill", style: `width:${pct}%` }));
    row.appendChild(bar);
    return row;
  }

  const panel = mk("section", { class: "mission-panel" });
  panel.append(
    mk("h3", { class: "panel-title", text: "Missionsstatus" }),
    track("Escape", `${keys}/3 Schluesselteile`, escape),
    track("Survival", `Runde ${state.game.round}/30`, survival),
    track("Warlord", `${state.game.stats.combatsWon}/10 Siege`, warlord)
  );
  return panel;
}

function buildSecondaryRail(state) {
  const rail = mk("section", { class: "secondary-rail" });

  const invDetails = mk("details", { class: "collapsible" });
  invDetails.append(mk("summary", { text: "Inventar & Loadout" }), inventoryPanel(state));
  rail.appendChild(invDetails);

  const logDetails = mk("details", { class: "collapsible" });
  logDetails.append(mk("summary", { text: "Lagebericht" }), logPanel(state));
  rail.appendChild(logDetails);

  return rail;
}

function contextRecommendations(state) {
  if (state.game.combat.active && state.game.combat.phase === "PREP") {
    return "Waehle Haltung und Start-Item. Ein klarer Start spart spaeter HP.";
  }
  if (state.game.combat.active && state.game.combat.phase === "ACTIVE") {
    return state.game.hp <= 4
      ? "HP kritisch: wenn Retreat offen ist, sichere den Run."
      : "Druck halten, aber Vorrat fuer den naechsten District schonen.";
  }
  if (state.game.encounter.active) return "Kontakt aktiv: nimm die Option mit bester Ressourcenlage.";
  if (state.game.transit.active) return "Transit aktiv: Fortschritt halten, auf Unterbrechungen reagieren.";
  if (state.game.supplies <= 3) return "Vorrat knapp: Forage oder sicheren Container priorisieren.";
  if (state.game.hp <= 4) return "HP niedrig: erst stabilisieren, dann Risiko nehmen.";
  if (state.game.morale <= 3) return "Moral niedrig: Rest priorisieren.";
  return "Stabile Lage: Scout fuer Infos oder Route Richtung Ziel.";
}

function recommendedActionChoice(state) {
  if (state.game.supplies <= 3) return "FORAGE";
  if (state.game.hp <= 4 || state.game.morale <= 3) return "REST";
  return "SCOUT";
}

function contextPanel(state) {
  const tone = contextTone(state);
  const cur = findDistrict(state.game.playerDistrict);
  const section = mk("section", { class: "encounter-panel context-panel" });
  section.append(
    mk("h3", { class: "panel-title", text: "Kontextfenster" }),
    mk("p", {
      class: "sub context-line",
      text: `${cur?.name ?? "Unbekannt"}`
    })
  );

  const chips = mk("div", { class: "context-chips" });
  const keyOwned = KEY_IDS.filter((id) => state.game.inventory.items.some((it) => it.id === id)).length;
  const focusTag = keyOwned < 3 ? `Schluesselteile ${keyOwned}/3` : "Fluchtziel aktiv";
  chips.append(
    mk("span", { class: `context-chip ${tone.cls}`, text: tone.label }),
    mk("span", { class: "context-chip", text: focusTag })
  );
  section.appendChild(chips);
  section.append(
    mk("p", { class: "sub context-focus", text: objectiveLine(state) }),
    mk("p", { class: "sub context-focus", text: `Schluesselteile: ${keyItemNames(state)}` }),
    mk("p", { class: "sub context-reco", text: contextRecommendations(state) })
  );
  return section;
}

function defeatReasonText(reason) {
  if (reason === "HP_ZERO") return "Du bist an deinen Wunden gestorben.";
  if (reason === "SUPPLIES_ZERO") return "Der Vorrat ist kollabiert.";
  if (reason === "MORALE_ZERO") return "Die Moral ist vollstaendig zerbrochen.";
  return `Ursache: ${reason}`;
}

function winReasonText(reason) {
  if (reason === "CENTRAL_HUB_ESCAPE") return "Aschekreuz erreicht, drei Schluesselteile gesichert.";
  if (reason === "SURVIVAL_MASTER") return "30 Runden ueberlebt.";
  if (reason === "WARLORD_PATH") return "Kampfherrschaft in der Unterstadt durchgesetzt.";
  return `Siegpfad: ${reason || "UNBEKANNT"}`;
}

function encounterDecisionPanel(state) {
  const decisionWrap = mk("section", { class: "encounter-panel", "data-encounter-decision": "1" });
  decisionWrap.append(
    mk("h3", { class: "panel-title", text: "Begegnung" }),
    mk("p", { class: "sub", text: state.game.encounter.text || "Unbekannte Begegnung im Staub." }),
    mk("p", { class: "sub", text: "Waehle jetzt eine Hauptaktion." })
  );
  const row = mk("div", { class: "choice-grid" });
  const options = state.game.encounter.options || [];
  if (options.length === 0) {
    row.appendChild(mk("button", { class: "btn encounter-option primary", "data-resolve-option": "", "data-resolve-mode": "DECISION", text: "Weiter", type: "button" }));
  } else {
    const preferredIndex = options.findIndex((o) => o.mode === "DECISION");
    for (let i = 0; i < options.length; i++) {
      row.appendChild(encounterOptionButton(options[i], i === (preferredIndex >= 0 ? preferredIndex : 0)));
    }
  }
  decisionWrap.appendChild(row);
  return decisionWrap;
}

function inventoryPanel(state) {
  const inv = mk("section", { class: "inv-list" });
  inv.appendChild(mk("h3", { class: "panel-title", text: "Ausrüstung" }));

  const loadoutSlots = mk("div", { class: "inv-row quick-slots" });
  const slots = state.game.loadout.slots || {};
  for (const slot of Object.keys(slots)) {
    const equippedId = slots[slot];
    const equippedItem = state.game.inventory.items.find((it) => it.id === equippedId) || itemById(equippedId);
    const slotCell = mk("div", { class: "slot-cell" });
    const label = equippedItem ? equippedItem.name : "-";
    slotCell.append(
      mk("span", { class: "slot-label", text: slot }),
      mk("span", { class: "slot-value", text: label }),
      mk("button", { class: "btn ghost", "data-unequip-slot": String(slot), text: "Unequip" })
    );
    if (!equippedItem) applyDisabledState(slotCell.querySelector("button"), "Slot ist bereits leer.");
    loadoutSlots.append(
      slotCell
    );
  }
  inv.appendChild(loadoutSlots);

  if (state.game.inventory.items.length === 0) {
    inv.appendChild(mk("p", { class: "sub", text: "Noch leer. Loot kommt beim Durchqueren neuer Bezirke." }));
  } else {
    for (const [idx, item] of state.game.inventory.items.entries()) {
      const instanceId = itemInstanceId(item, idx);
      const selected = state.game.inventory.selectedCombatItemInstanceId
        ? state.game.inventory.selectedCombatItemInstanceId === instanceId
        : state.game.inventory.selectedCombatItemId === item.id;
      const equipped = Object.values(slots).includes(item.id);
      const row = mk("div", { class: `inv-row${selected ? " selected" : ""}${equipped ? " equipped" : ""}` });
      const canEquip = !!item.slot && item.slot !== "NONE";
      const status = [];
      if (selected) status.push("selected");
      if (equipped) status.push("equipped");
      if (item.kind === "CONSUMABLE") status.push("consumable");
      const info = mk("div", { class: "inv-main" });
      info.append(
        mk("span", { class: "inv-name", text: item.name }),
        mk("span", { class: "inv-effect", text: item.effect }),
        mk("span", { class: "item-tags", text: status.join(" · ") || "normal" })
      );

      const actions = mk("div", { class: "inv-actions" });
      const selectBtn = mk("button", {
        class: selected ? "btn ghost" : "btn",
        "data-select-combat-item": String(item.id),
        "data-select-combat-item-instance": String(instanceId),
        text: selected ? "Im Kampfslot" : "Als Kampfslot"
      });
      if (selected) applyDisabledState(selectBtn, "Bereits als Kampfslot gesetzt.");
      actions.appendChild(selectBtn);

      const detailBtn = mk("button", { class: "btn ghost", "data-item-detail": String(item.id), text: "Detail" });
      actions.appendChild(detailBtn);

      const equipBtn = mk("button", {
        class: "btn ghost",
        "data-equip-item": String(item.id),
        "data-equip-slot": String(item.slot || ""),
        text: equipped ? "Ausgeruestet" : "Ausrüsten"
      });
      if (!canEquip) applyDisabledState(equipBtn, "Dieses Item hat keinen ausruestbaren Slot.");
      else if (equipped) applyDisabledState(equipBtn, "Item ist bereits ausgeruestet.");
      actions.appendChild(equipBtn);

      row.append(info, actions);
      inv.appendChild(row);
    }
  }
  return inv;
}

function inventoryDetailPanel(state) {
  if (state.game.inventory.detailItemId < 0) return null;
  const detail = state.game.inventory.items.find((it) => it.id === state.game.inventory.detailItemId);
  if (!detail) return null;
  const pane = mk("section", { class: "dialog-box" });
  pane.append(
    mk("p", { class: "sub", text: `${detail.name} // ${detail.kind}` }),
    mk("canvas", { width: "520", height: "120", class: "item-canvas", "data-item-canvas": "1" }),
    mk("p", { class: "sub", text: detail.flavor }),
    mk("button", { class: "btn ghost", "data-close-item-detail": "1", text: "Schliessen" })
  );
  return pane;
}

function combatHeader(state) {
  const wrap = mk("section", { class: "encounter-panel fold-in combat-dash" });
  const phase = state.game.combat.phase;
  const stance = state.game.combat.stance || "BALANCED";

  wrap.append(
    mk("h3", { class: "panel-title", text: "Kampfzone" }),
    mk("p", { class: "sub", text: `Phase: ${phase} // Stance: ${stance}` }),
    mk("p", { class: "sub", text: `Enemy: ${state.game.combat.enemyName || "-"} (${state.game.combat.enemyId || "UNKNOWN"})` })
  );

  wrap.appendChild(lifeBar(state.game.hp, state.game.maxHp, "Du", "player"));
  if (state.game.combat.enemyMaxHp > 0) {
    wrap.appendChild(lifeBar(state.game.combat.enemyHp, state.game.combat.enemyMaxHp, state.game.combat.enemyName || "Gegner", "enemy"));
  }
  return wrap;
}

function renderCombatPrep(state, wrap) {
  const stance = state.game.combat.stance || "BALANCED";
  const selectedInstanceId = String(state.game.inventory.selectedCombatItemInstanceId || "");
  const selectedByInstance = selectedInstanceId
    ? state.game.inventory.items.find((it, idx) => itemInstanceId(it, idx) === selectedInstanceId)
    : null;
  const selectedId = state.game.inventory.selectedCombatItemId;
  const selectedItem = selectedByInstance || state.game.inventory.items.find((it) => it.id === selectedId);
  wrap.append(
    mk("p", { class: "sub", text: state.game.combat.introText }),
    mk("p", { class: "sub", text: "Haltung waehlen, dann Kampf starten." })
  );
  const stanceRow = mk("div", { class: "stance-row" });
  const stances = ["AGGRESSIVE", "DEFENSIVE", "BALANCED"];
  for (const s of stances) {
    const b = mk("button", { class: `btn ghost${stance === s ? " selected" : ""}`, "data-stance": s, text: s });
    stanceRow.appendChild(b);
  }
  wrap.append(
    stanceRow,
    mk("p", { class: "sub", text: `Start-Item: ${selectedItem ? selectedItem.name : "kein Item gewaehlt"}` }),
    mk("button", { class: "btn combat-cta", "data-begin-combat": "1", text: "Kampf beginnen" })
  );
}

function renderCombatActive(state, wrap) {
  const canRetreat = state.game.hp > 2 && state.game.combat.enemyHp > Math.floor(state.game.combat.enemyMaxHp / 2);
  const hasEmergencyItem = state.game.inventory.items.some((it) => it.kind === "CONSUMABLE");
  const emergencyLocked = state.game.combat.emergencyUsed || !hasEmergencyItem;
  wrap.appendChild(mk("p", { class: "sub", text: "Gefecht aktiv. Notfall nutzen oder Linie halten." }));
  const emergencyBtn = mk("button", { class: "btn ghost", "data-use-emergency": "1", text: state.game.combat.emergencyUsed ? "Notfall bereits genutzt" : "Notfall-Item" });
  if (emergencyLocked) applyDisabledState(emergencyBtn, state.game.combat.emergencyUsed ? "Notfall in diesem Kampf bereits genutzt." : "Kein Consumable verfuegbar.");
  wrap.appendChild(emergencyBtn);
  const retreatBtn = mk("button", { class: "btn ghost", "data-retreat-combat": "1", text: "Retreat" });
  if (!canRetreat) applyDisabledState(retreatBtn, "Retreat erst bei ausreichender HP und hohem Gegner-HP moeglich.");
  wrap.appendChild(retreatBtn);
}

function renderCombatOutcome(state, wrap) {
  const outcome = state.game.combat.lastOutcome || "NONE";
  wrap.appendChild(mk("p", { class: "sub", text: `Kampf beendet: ${outcome}` }));
  if (state.game.combat.pendingLootItemIds.length > 0) {
    const names = state.game.combat.pendingLootItemIds.map((id) => itemById(id)?.name || `Item#${id}`).join(", ");
    wrap.append(
      mk("p", { class: "sub", text: `Loot bereit: ${names}` }),
      mk("button", { class: "btn combat-cta", "data-collect-combat-loot": "1", text: "Loot sichern" })
    );
  } else {
    wrap.appendChild(mk("p", { class: "sub", text: "Kein Loot in diesem Kampf." }));
  }
}

function appendCombatTimeline(state, wrap) {
  if (state.game.combat.logLines.length > 0) {
    const list = mk("ul", { class: "log-list combat-timeline" });
    for (const line of [...state.game.combat.logLines].reverse()) {
      list.appendChild(mk("li", { text: line }));
    }
    wrap.append(mk("p", { class: "sub", text: "Letzte Aktionen" }), list);
  }
}

function buildCombatPrepPanel(state) {
  const wrap = combatHeader(state);
  renderCombatPrep(state, wrap);
  return wrap;
}

function buildCombatActivePanel(state) {
  const wrap = combatHeader(state);
  renderCombatActive(state, wrap);
  appendCombatTimeline(state, wrap);
  return wrap;
}

function buildCombatOutcomePanel(state) {
  const wrap = combatHeader(state);
  renderCombatOutcome(state, wrap);
  appendCombatTimeline(state, wrap);
  return wrap;
}

function logPanel(state) {
  const log = mk("section", { class: "encounter-panel log-panel" });
  log.appendChild(mk("h3", { class: "panel-title", text: "Lagebericht" }));
  const lines = [...state.game.log].slice(-3).reverse();
  if (lines.length === 0) {
    log.appendChild(mk("p", { class: "sub", text: "Keine Eintraege." }));
    return log;
  }
  const ul = mk("ul", { class: "log-list" });
  for (const l of lines) ul.appendChild(mk("li", { text: l }));
  log.appendChild(ul);
  return log;
}

function mapPanel(state) {
  const map = mk("section", { class: "hero map-hero" });
  const stack = mk("div", { class: "map-stack" });
  stack.append(
    mk("canvas", { class: "hero-canvas map-canvas", width: "900", height: "320", "data-city-map": "1" }),
    mk("canvas", { class: "hero-canvas fx-canvas", width: "900", height: "320", "data-city-fx": "1", "aria-hidden": "true" })
  );
  map.append(
    stack,
    mk("div", { class: "map-hint", "data-map-hint": "1", text: "Tippe auf einen District fuer Route-Info." }),
    mk("div", { class: "map-selected", "data-map-selected": "1", text: "Auswahl: kein District gewaehlt." })
  );
  return map;
}

function worldStatusPanel(state) {
  const section = mk("section", { class: "encounter-panel status-window world-window", "data-status-window": "WORLD" });
  section.append(
    mk("h3", { class: "panel-title", text: "Substrate-Livezustand" }),
    mk("p", { class: "sub", text: "Greife ein, bevor das System sich gegen dich stabilisiert." })
  );
  const s = state.game.substrate;
  const metrics = mk("div", { class: "substrate-grid" });
  const mkMetric = (label, value, cls = "") => {
    const item = mk("div", { class: `substrate-cell ${cls}`.trim() });
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    const meter = mk("span", { class: "substrate-meter" });
    meter.appendChild(mk("i", { style: `width:${pct}%` }));
    item.append(
      mk("span", { class: "substrate-label", text: label }),
      mk("span", { class: "substrate-value", text: `${pct}%` }),
      meter
    );
    return item;
  };
  metrics.append(
    mkMetric("Alive", s.alivePct, s.alivePct <= 20 ? "danger" : ""),
    mkMetric("Light", s.lightPct, s.lightPct <= 30 ? "warn" : ""),
    mkMetric("Toxin", s.toxinPct, s.toxinPct >= 45 ? "danger" : ""),
    mkMetric("Control", s.lineageControlPct, s.lineageControlPct >= 55 ? "good" : ""),
    mkMetric("Mutation", Math.min(100, (s.mutationLevel || 0) * 11), s.mutationLevel >= 5 ? "warn" : "")
  );
  section.appendChild(metrics);

  const actions = mk("div", { class: "choice-grid" });
  const disabled = state.game.transit.active || state.game.encounter.active || state.game.combat.active || state.game.over;
  const disabledReason = state.game.over
    ? "Aktion gesperrt: Spiel ist beendet."
    : state.game.combat.active
      ? "Aktion gesperrt: Kampf ist aktiv."
      : state.game.encounter.active
        ? "Aktion gesperrt: Begegnung erst aufloesen."
        : state.game.transit.active
          ? "Aktion gesperrt: waehrend Transit nicht verfuegbar."
          : "";
  const recommended = recommendedActionChoice(state);
  const actionDefs = [
    ["SCOUT", "Scout", "Deckt Wege und Hidden-Loot auf.", "leicht", "Info + Loot-Chance", "mittel"],
    ["FORAGE", "Forage", "Schneller Vorratslauf im Truemmerfeld.", "mittel", "starker Vorratsgewinn", "hoch"],
    ["REST", "Rest", "Stabilisiert den Trupp fuer den naechsten Zug.", "Zeit", "Moral + Erholung", "niedrig"]
  ];
  const primaryDef = actionDefs.find((it) => it[0] === recommended) || actionDefs[0];
  const secondaryDefs = actionDefs.filter((it) => it !== primaryDef);

  actions.appendChild(actionCard(
    primaryDef[0], primaryDef[1], primaryDef[2], primaryDef[3], primaryDef[4], primaryDef[5],
    disabled, disabledReason, { primary: true, recommended: true }
  ));
  for (const it of secondaryDefs) {
    actions.appendChild(actionCard(
      it[0], it[1], it[2], it[3], it[4], it[5],
      disabled, disabledReason, { primary: false, recommended: false }
    ));
  }
  section.appendChild(actions);

  const interventions = mk("div", { class: "choice-grid status-sub" });
  const influence = state.game.substrate.influence;
  const interventionDefs = [
    ["LIGHT_PULSE", "Licht-Impuls", 1],
    ["NUTRIENT_INJECTION", "Naehrstoff", 2],
    ["TOXIN_ABSORB", "Toxin-Absorb", 2],
    ["STRENGTHEN_LINEAGE", "Linie staerken", 3],
    ["TRIGGER_RAID", "Raid", 4],
    ["BUILD_BRIDGE", "Bruecke", 3],
    ["QUARANTINE_ZONE", "Quarantaene", 5]
  ];
  for (const [kind, label, cost] of interventionDefs) {
    const btn = mk("button", {
      class: "btn ghost",
      type: "button",
      "data-intervention": kind,
      text: `${label} (-${cost} Inf.)`
    });
    const reason = interventionDisabledReason(state, kind, cost, disabled, disabledReason);
    if (reason) applyDisabledState(btn, reason);
    interventions.appendChild(btn);
  }
  section.append(
    mk("p", { class: "sub", text: `Interventionen (Einfluss: ${influence})` }),
    interventions
  );

  const travel = mk("div", { class: "choice-grid travel-grid status-sub", "data-travel-grid": "1" });
  section.append(
    mk("p", { class: "sub", text: "Route waehlen" }),
    travel
  );

  const containers = mk("div", { class: "choice-grid travel-grid status-sub" });
  const districtId = state.game.playerDistrict;
  for (const id of DISTRICT_LOOT_CONTAINERS[districtId] || []) {
    const def = lootContainerById(id);
    const key = `${districtId}:${id}`;
    const hidden = id === "vault_black" && !state.game.lootContainers.discovered.includes(key);
    const opened = state.game.lootContainers.opened.includes(key);
    if (hidden) continue;
      const label = def ? `${def.type} (${id})` : id;
      const btn = mk("button", { class: "btn ghost", "data-open-container": key, text: opened ? `${label} [gelootet]` : label });
      if (opened) applyDisabledState(btn, "Container bereits geoeffnet.");
      else if (disabled) applyDisabledState(btn, disabledReason);
      containers.appendChild(btn);
    }
  section.append(
    mk("p", { class: "sub", text: "Container" }),
    containers
  );
  return section;
}

function transitStatusPanel(state) {
  const section = mk("section", { class: "encounter-panel status-window", "data-status-window": "TRANSIT" });
  section.append(
    mk("h3", { class: "panel-title", text: "Transit" }),
    mk("p", { class: "sub", text: `Du bewegst dich durch die Ruinen. Fortschritt: ${state.game.transit.progress}%` })
  );
  return section;
}

function travelPanel(state) {
  const district = findDistrict(state.game.playerDistrict);
  const section = mk("section", { class: "encounter-panel" });
  section.append(
    mk("h3", { class: "panel-title", text: "Stadtkarte" }),
    mk("p", { class: "sub", text: `Aktuelle Position: ${district?.name ?? "Unbekannt"}` }),
    mk("div", { class: "choice-grid travel-grid", "data-travel-grid": "1" })
  );
  return section;
}

function scavengePanel(state) {
  const districtId = state.game.playerDistrict;
  const section = mk("section", { class: "encounter-panel" });
  section.append(
    mk("h3", { class: "panel-title", text: "Pluendern" }),
    mk("p", { class: "sub", text: "Suchen kostet Vorrat. In manchen Verstecken wartet ein Hinterhalt." })
  );
  const row = mk("div", { class: "choice-grid travel-grid" });
  const containers = DISTRICT_LOOT_CONTAINERS[districtId] || [];
  if (containers.length === 0) {
    row.appendChild(mk("p", { class: "sub", text: "Keine bekannten Container in diesem District." }));
  } else {
    for (const id of containers) {
      const def = lootContainerById(id);
      const key = `${districtId}:${id}`;
      const hidden = id === "vault_black" && !state.game.lootContainers.discovered.includes(key);
      const opened = state.game.lootContainers.opened.includes(key);
      if (hidden) continue;
      const label = def ? `${def.type} (${id})` : id;
      const btn = mk("button", { class: "btn ghost", "data-open-container": key, text: opened ? `${label} [gelootet]` : label });
      if (opened || state.game.transit.active || state.game.encounter.active || state.game.combat.active || state.game.over) {
        btn.setAttribute("disabled", "true");
      }
      row.appendChild(btn);
    }
  }
  section.appendChild(row);
  return section;
}

function decisionPanel(state) {
  const section = mk("section", { class: "encounter-panel" });
  const disabled = state.game.transit.active || state.game.encounter.active || state.game.combat.active || state.game.over;
  section.append(
    mk("h3", { class: "panel-title", text: "Rundenaktion" }),
    mk("div", { class: "decision-grid" })
  );
  const grid = section.querySelector(".decision-grid");
  grid.append(
    actionCard("SCOUT", "Spaehen", "Du liest Wege, Schatten und Fallen vor dem Trupp.", "Leichter Gesundheitsdruck", "Mehr Kartenwissen + Chance auf Hidden-Loot", "Mittel", disabled),
    actionCard("FORAGE", "Sammeln", "Du gehst in Truemmerzonen auf schnelle Vorratssuche.", "Erschoepfung und Verletzungsrisiko", "Starker Vorratsgewinn", "Mittel-Hoch", disabled),
    actionCard("REST", "Rasten", "Du ziehst den Trupp kurz aus der Feuerlinie.", "Verbrauch von Zeit und Rationen", "Moral- und Stabilitaetsgewinn", "Niedrig-Mittel", disabled)
  );
  return section;
}

function endPanel(state) {
  const outcome = state.game.winLose.state || "ONGOING";
  if (outcome === "ONGOING" && !state.game.over) return null;
  const end = mk("section", { class: "end-screen" });
  const reason = state.game.winLose.reason || "UNKNOWN";
  if (outcome === "LOSE" || (state.game.over && outcome !== "WIN")) {
    end.append(
      mk("h2", { text: "Defeat" }),
      mk("p", { text: defeatReasonText(reason) }),
      mk("p", { text: `Runde: ${state.game.winLose.reachedAtRound >= 0 ? state.game.winLose.reachedAtRound : state.game.round}` })
    );
  } else {
    end.append(
      mk("h2", { text: "Victory" }),
      mk("p", { text: winReasonText(reason) }),
      mk("p", { text: `Runde: ${state.game.winLose.reachedAtRound >= 0 ? state.game.winLose.reachedAtRound : state.game.round}` })
    );
  }
  end.append(
    mk("p", { text: `Stats: Kills ${state.game.stats.combatsWon} | Fights ${state.game.stats.combatsStarted} | Decisions ${state.game.stats.decisionsMade}` })
  );
  end.append(mk("button", { "data-action": "menu", class: "btn", text: "Zurueck ins Menu" }));
  return end;
}

function buildGame(state) {
  const card = mk("section", { class: "card card-game game-shell" });
  const mode = gameModeFromState(state);
  card.setAttribute("data-game-mode", mode);
  const showMap = mode === "EXPLORATION" || mode === "TRANSIT";

  card.append(
    mk("h1", { text: "SUBSTRATE // Unified Run" }),
    buildTopBar(state),
    buildMissionProgress(state),
    contextPanel(state),
    mk("p", { class: "sub story-line", "data-game-event": "1", text: state.game.lastEvent })
  );

  const grid = mk("div", { class: "game-main-grid" });
  const primary = mk("div", { class: "primary-zone" });
  const secondary = mk("aside", { class: "secondary-zone" });

  if (showMap) primary.appendChild(mapPanel(state));

  if (mode === "COMBAT_PREP") {
    const combat = buildCombatPrepPanel(state);
    combat.classList.add("status-window");
    combat.setAttribute("data-status-window", "COMBAT");
    primary.appendChild(combat);
  } else if (mode === "COMBAT_ACTIVE") {
    const combat = buildCombatActivePanel(state);
    combat.classList.add("status-window");
    combat.setAttribute("data-status-window", "COMBAT");
    primary.appendChild(combat);
  } else if (mode === "COMBAT_OUTCOME") {
    const combat = buildCombatOutcomePanel(state);
    combat.classList.add("status-window");
    combat.setAttribute("data-status-window", "COMBAT");
    primary.appendChild(combat);
  } else if (mode === "ENCOUNTER") {
    const encounter = encounterDecisionPanel(state);
    encounter.classList.add("status-window");
    encounter.setAttribute("data-status-window", "DIALOG");
    primary.appendChild(encounter);
  } else if (mode === "TRANSIT") {
    primary.appendChild(transitStatusPanel(state));
  } else if (mode === "EXPLORATION") {
    primary.appendChild(worldStatusPanel(state));
  }

  if (mode !== "OUTCOME") secondary.appendChild(buildSecondaryRail(state));

  grid.append(primary, secondary);
  card.appendChild(grid);

  const detail = inventoryDetailPanel(state);
  if (detail) card.append(detail);

  const end = endPanel(state);
  if (end) card.append(end);
  else card.appendChild(mk("button", { "data-action": "menu", class: "btn ghost", text: "Back" }));

  return card;
}

function draw(state) {
  if (state.ui.screen === "MAIN_MENU") return buildMainMenu(state);
  if (state.ui.screen === "RULES") return buildRules(state);
  if (state.ui.screen === "LOADOUT_SELECTION") return buildLoadoutSelection(state);
  if (state.ui.screen === "DIALOG") return buildDialog(state);
  return buildGame(state);
}

export function render(state) {
  const node = draw(state);

  if (state.ui.screen === "DIALOG") {
    const lines = [
      "Die Luft ist tot, aber du atmest noch. Das ist dein Startvorteil.",
      "Wenn jemand freundlich klingt, pruef zuerst den Schatten hinter ihm.",
      "Jede Wahl brennt sich ein. Die Zone vergisst nie."
    ];
    const current = lines[state.dialog.step] ?? lines[lines.length - 1];
    const lineNode = node.querySelector('[data-dialog-line="1"]');
    if (lineNode) lineNode.textContent = current;
    const nextBtn = node.querySelector('[data-action="next-dialog"]');
    if (nextBtn && state.dialog.step >= lines.length - 1) nextBtn.textContent = "In die Zone";
    return node;
  }

  if (state.ui.screen !== "GAME") return node;

  const mapCanvas = node.querySelector('[data-city-map="1"]');
  const hovered = Number(mapCanvas?.getAttribute("data-hover-district") ?? -1);
  const frame = (state.game.panelAnim * 7 + state.game.transit.progress + state.game.combat.tick + state.game.round) % 120;
  paintCityMap(mapCanvas, state, Number.isNaN(hovered) ? -1 : hovered, frame);

  const travelGrid = node.querySelector('[data-travel-grid="1"]');
  if (travelGrid) {
    const fromId = state.game.playerDistrict;
    const roads = CITY_ROADS.filter((r) => r.a === fromId || r.b === fromId);
    const disabledByState = state.game.transit.active || state.game.encounter.active || state.game.combat.active || state.game.over;
    const disabledReason = state.game.over
      ? "Spiel beendet."
      : state.game.combat.active
        ? "Kampf aktiv."
        : state.game.encounter.active
          ? "Begegnung erst aufloesen."
          : state.game.transit.active
            ? "Waerend Transit gesperrt."
            : "";

    for (const road of roads) {
      const toId = road.a === fromId ? road.b : road.a;
      const d = findDistrict(toId);
      const risk = districtRiskValue(DISTRICT_PROFILE.find((p) => p.id === toId), toId);
      const routeBtn = mk("button", { class: `btn ghost route-card${road.blocked ? " blocked" : ""}`, type: "button" });
      if (!road.blocked) routeBtn.setAttribute("data-travel-to", String(toId));
      routeBtn.append(
        mk("span", { class: "route-title", text: d?.name ?? `District ${toId}` }),
        mk("span", { class: "route-meta", text: `Risiko ${risk} • ${road.blocked ? "Blockiert" : "Offen"}` })
      );

      if (road.blocked) {
        applyDisabledState(routeBtn, "Route blockiert.");
      } else if (disabledByState) {
        applyDisabledState(routeBtn, disabledReason);
      }
      travelGrid.appendChild(routeBtn);
    }
  }

  const hintNode = node.querySelector('[data-map-hint="1"]');
  const selectedNode = node.querySelector('[data-map-selected="1"]');
  if (hintNode && mapCanvas) {
    const hoveredDistrict = CITY_DISTRICTS.find((d) => d.id === hovered);
    if (hoveredDistrict) {
      const profile = DISTRICT_PROFILE.find((p) => p.id === hoveredDistrict.id);
      const open = neighborsOpen(hoveredDistrict.id)
        .map((id) => findDistrict(id)?.name ?? id)
        .join(", ");
      const blockedTo = CITY_ROADS.filter((r) => r.blocked && (r.a === hoveredDistrict.id || r.b === hoveredDistrict.id))
        .map((r) => findDistrict(r.a === hoveredDistrict.id ? r.b : r.a)?.name ?? "?")
        .join(", ");
      const risk = districtRiskValue(profile, hoveredDistrict.id);
      const threat = (profile?.enemyPool || []).length;
      hintNode.textContent = `District: ${hoveredDistrict.name} // Risiko ${risk} // Feindtypen ${threat} // Open: ${open || "-"} // Blocked: ${blockedTo || "-"}`;
    } else if (state.game.transit.active) {
      hintNode.textContent = `Transit aktiv: ${state.game.transit.progress}%`;
    } else {
      hintNode.textContent = "Tippe auf einen District fuer Route-Info.";
    }
  }
  if (selectedNode && mapCanvas) {
    const selectedId = Number(mapCanvas.dataset.selectedDistrict ?? -1);
    const selectedDistrict = CITY_DISTRICTS.find((d) => d.id === selectedId);
    if (selectedDistrict) {
      const open = neighborsOpen(selectedDistrict.id)
        .map((id) => findDistrict(id)?.name ?? id)
        .join(", ");
      const blockedTo = CITY_ROADS.filter((r) => r.blocked && (r.a === selectedDistrict.id || r.b === selectedDistrict.id))
        .map((r) => findDistrict(r.a === selectedDistrict.id ? r.b : r.a)?.name ?? "?")
        .join(", ");
      const risk = districtRiskValue(DISTRICT_PROFILE.find((p) => p.id === selectedDistrict.id), selectedDistrict.id);
      selectedNode.textContent = `Auswahl: ${selectedDistrict.name} // Risiko ${risk} // Offen: ${open || "-"} // Blockiert: ${blockedTo || "-"}`;
    } else {
      selectedNode.textContent = "Auswahl: kein District gewaehlt.";
    }
  }

  const itemCanvas = node.querySelector('[data-item-canvas="1"]');
  if (itemCanvas) {
    const detail = state.game.inventory.items.find((it) => it.id === state.game.inventory.detailItemId);
    paintItemCard(itemCanvas, detail);
  }

  if (state.game.over) {
    for (const btn of node.querySelectorAll('[data-choice],[data-travel-to],[data-begin-combat],[data-resolve-mode],[data-open-container],[data-retreat-combat],[data-collect-combat-loot],[data-use-emergency],[data-equip-item],[data-unequip-slot],[data-intervention]')) {
      btn.setAttribute("disabled", "true");
    }
  }

  if (mapCanvas) {
    mapCanvas.dataset.hitTest = "district";
    mapCanvas.dataset.hoverDistrict = "-1";
    mapCanvas.dataset.selectedDistrict = mapCanvas.dataset.selectedDistrict || "-1";
    mapCanvas.dataset.hoverHelper = "1";
    mapCanvas._districtAt = districtAt;
  }

  return node;
}

export { draw };
