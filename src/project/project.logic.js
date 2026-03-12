import { findDistrict, isRoadOpen } from "./city.map.js";
import { DISTRICT_LOOT_CONTAINERS, districtLootItemId, itemById, lootContainerById } from "./inventory.module.js";
import { DECISION_CATALOG } from "./decisions.module.js";
import { DISTRICT_PROFILE } from "./districts.module.js";
import { ENEMY_CATALOG } from "./enemies.module.js";
import { featureFlagsForProfile, normalizeReleaseProfile } from "./release.profiles.js";

const KEY_ITEM_IDS = [11, 12, 21];
const SUPPLIES_CAP = 15;
const MORALE_CAP = 10;
const INFLUENCE_FAIL_TICKS = 50;

const INTERVENTION_CONFIG = {
  LIGHT_PULSE: { cost: 1, light: +8, toxin: +1, alive: +2, lineage: +1, mutation: 0, text: "Licht-Impuls stabilisiert kurzfristig die Front." },
  NUTRIENT_INJECTION: { cost: 2, light: 0, toxin: +3, alive: +4, lineage: +1, mutation: +1, text: "Naehrstoff-Injektion staerkt Wachstum, aber foerdert Nebenreaktionen." },
  TOXIN_ABSORB: { cost: 2, light: -1, toxin: -9, alive: +2, lineage: 0, mutation: -1, text: "Toxin-Absorption entlastet Cluster auf Kosten von Stabilitaet." },
  STRENGTHEN_LINEAGE: { cost: 3, light: 0, toxin: +1, alive: +1, lineage: +6, mutation: +1, text: "Linienstaerkung schiebt Kontrolle in deine Bindung." },
  TRIGGER_RAID: { cost: 4, light: -2, toxin: +4, alive: -2, lineage: +8, mutation: +1, text: "Raid ausgeloest: hoher Gewinn, hohes Gegenrisiko." },
  BUILD_BRIDGE: { cost: 3, light: +2, toxin: -1, alive: +3, lineage: +2, mutation: 0, text: "Bruecke aufgebaut: Energiefluss zwischen Clustern stabilisiert." },
  QUARANTINE_ZONE: { cost: 5, light: -3, toxin: -6, alive: -3, lineage: +1, mutation: -1, text: "Quarantaene zieht harte Grenzen und rettet den Kern." }
};

function substrateFromState(state) {
  return state.game.substrate || {};
}

function resolveFeatureFlags(state) {
  const profile = normalizeReleaseProfile(state?.app?.releaseProfile);
  const base = featureFlagsForProfile(profile);
  const raw = state?.app?.featureFlags || {};
  return {
    autoResolveEncounterTimeout: raw.autoResolveEncounterTimeout ?? base.autoResolveEncounterTimeout,
    strictInfluenceDefeat: raw.strictInfluenceDefeat ?? base.strictInfluenceDefeat,
    enableRaidIntervention: raw.enableRaidIntervention ?? base.enableRaidIntervention
  };
}

function influenceFailTicksForState(state) {
  return resolveFeatureFlags(state).strictInfluenceDefeat ? 30 : INFLUENCE_FAIL_TICKS;
}

function influenceRegenFor(state) {
  const s = substrateFromState(state);
  const control = Number(s.lineageControlPct || 0);
  if (control > 30) return 2;
  if (control > 5) return 1;
  return 0;
}

function applySubstrateDrift(base, rng, seedTick) {
  const noiseA = rollForIndex(rng.world, seedTick + 11, -1, 2);
  const noiseB = rollForIndex(rng.sim, seedTick + 29, -1, 2);
  const noiseC = rollForIndex(rng.cos, seedTick + 47, -1, 2);
  return {
    alivePct: clampInt((base.alivePct || 0) + noiseA - Math.max(0, Math.floor((base.toxinPct || 0) / 45)), 0, 100),
    lightPct: clampInt((base.lightPct || 0) + noiseB, 0, 100),
    toxinPct: clampInt((base.toxinPct || 0) + noiseC, 0, 100),
    lineageControlPct: clampInt((base.lineageControlPct || 0) + (noiseA >= 0 ? 1 : -1), 0, 100),
    mutationLevel: clampInt((base.mutationLevel || 0) + (noiseC > 0 ? 1 : 0), 0, 9)
  };
}

function rollForIndex(stream, index, min, max) {
  let value = 0;
  const safe = Math.max(0, index | 0);
  for (let i = 0; i <= safe; i++) value = stream.int(min, max);
  return value;
}

function rollForRound(rng, round) {
  return rollForIndex(rng.sim, round, 0, 100);
}

function resolveChoice(choice, roll) {
  if (choice === "SCOUT") {
    if (roll < 40) return { hp: -1, supplies: 1, morale: 1, text: "Du kartierst die Ruinen. Eine Streifkugel trifft knapp, aber du findest Vorrat." };
    if (roll < 80) return { hp: 0, supplies: 2, morale: 1, text: "Du findest eine sichere Route und markierst einen Cache." };
    return { hp: -2, supplies: 3, morale: 0, text: "Tiefe Aufklaerung: hoher Preis, starker Fund." };
  }
  if (choice === "FORAGE") {
    if (roll < 35) return { hp: -1, supplies: 3, morale: 0, text: "Forage bringt saubere Kisten, aber kostet Kraft." };
    if (roll < 75) return { hp: -1, supplies: 2, morale: 0, text: "Standardlauf: genug Vorrat, kleiner Blutpreis." };
    return { hp: -2, supplies: 2, morale: -1, text: "Falle im Keller, dennoch mit Beute zurueck." };
  }
  if (roll < 45) return { hp: 2, supplies: -1, morale: 2, text: "Kurze Ruhe wirkt: Puls runter, Fokus rauf." };
  if (roll < 80) return { hp: 1, supplies: -1, morale: 2, text: "Rest stabilisiert die Linie trotz Verbrauch." };
  return { hp: 0, supplies: -1, morale: 1, text: "Unruhige Nacht, aber du faellst nicht auseinander." };
}

function modeFromRoll(roll) {
  const idx = roll % 3;
  if (idx === 0) return "KAMPF";
  if (idx === 1) return "DIALOG";
  return "PLUENDERN";
}

function substrateTransitSignal(state) {
  const s = substrateFromState(state);
  const toxin = clampInt(s.toxinPct || 0, 0, 100);
  const mutation = clampInt((s.mutationLevel || 0) * 11, 0, 100);
  const alive = clampInt(s.alivePct || 0, 0, 100);
  const light = clampInt(s.lightPct || 0, 0, 100);
  const control = clampInt(s.lineageControlPct || 0, 0, 100);

  // LifexLab-inspired pressure model: scarce/stressed worlds create more hostile contacts.
  const scarcity = clampInt(Math.max(0, 40 - light) + Math.max(0, 30 - alive), 0, 100);
  const instability = clampInt(Math.floor(toxin * 0.6) + Math.floor(mutation * 0.4), 0, 100);
  const dominance = clampInt(Math.max(0, control - 55), 0, 45);
  const threat = clampInt(Math.floor(instability * 0.55) + Math.floor(scarcity * 0.35) + Math.floor(dominance * 0.3), 0, 100);
  const stability = clampInt(Math.floor(alive * 0.55) + Math.floor(light * 0.45) - Math.floor(toxin * 0.25), 0, 100);

  return {
    threat,
    stability,
    encounterBonus: clampInt(Math.floor(threat / 9) - Math.floor(stability / 30), 0, 16),
    combatBias: clampInt(Math.floor(threat / 2) - Math.floor(stability / 4), -20, 35)
  };
}

const SUBSTRATE_ENCOUNTERS = [
  { id: "TOXIN_FRONT", required: "DECISION", timeout: 7, text: "Die dunkle Zone frisst sich in deinen Randcluster." },
  { id: "HUNGER_WINTER", required: "DECISION", timeout: 7, text: "Licht bricht ein. Die Kolonie kippt in Hungerstress." },
  { id: "OPPORTUNITY_RAID", required: "COMBAT", timeout: 5, text: "Die Gegenlinie ist offen. Ein Raidfenster entsteht." },
  { id: "FOREIGN_MUTATION", required: "DECISION", timeout: 6, text: "Hue-Drift zeigt eine fremde Mutation im Kern." },
  { id: "BRIDGE_STRAIN", required: "DECISION", timeout: 6, text: "Eine Bruecke ueberlaedt. Energie fliesst in beide Richtungen." },
  { id: "TOXIN_BLOOM", required: "DECISION", timeout: 6, text: "Toxin-Peak steht bevor. Cluster zeigen Kollapszeichen." },
  { id: "SYMBIOSIS_WINDOW", required: "DECISION", timeout: 7, text: "Beide Linien sind stabil. Ein Symbiose-Fenster oeffnet sich." },
  { id: "DOMINANCE_PUSH", required: "COMBAT", timeout: 5, text: "Kontrollanteil steigt. Dominanz kann jetzt erzwungen werden." },
  { id: "METAMORPH_SPIKE", required: "DECISION", timeout: 6, text: "Mutation-Level springt. Metamorphose wird instabil." },
  { id: "VACUUM_EDGE", required: "DECISION", timeout: 6, text: "Ein Vakuum entsteht am toten Rand. Expansion lockt." },
  { id: "QUARANTINE_BREACH", required: "DECISION", timeout: 5, text: "Quarantaene-Ring reisst. Kontamination drueckt durch." },
  { id: "RESONANCE_CORE", required: "DECISION", timeout: 7, text: "Superzell-Resonanz baut Druck im Clusterzentrum auf." }
];

function encounterOptionsById(id) {
  const common = {
    wait: { id: "wait", label: "Abwarten", mode: "DECISION", costText: "-0 influence", gainText: "+0", riskText: "Hoch", hpDelta: 0, suppliesDelta: 0, moraleDelta: -1 }
  };
  const table = {
    TOXIN_FRONT: [
      { id: "absorb", label: "Toxin absorbieren", mode: "DECISION", costText: "-2 influence", gainText: "+Stabilitaet", riskText: "Mittel", hpDelta: 0, suppliesDelta: 0, moraleDelta: 1 },
      { id: "retreat", label: "Randzone aufgeben", mode: "DECISION", costText: "-0", gainText: "+Sicherheit", riskText: "Mittel", hpDelta: 0, suppliesDelta: -1, moraleDelta: 0 },
      common.wait
    ],
    HUNGER_WINTER: [
      { id: "pulse", label: "Licht-Impuls", mode: "DECISION", costText: "-1 influence", gainText: "+Licht", riskText: "Niedrig", hpDelta: 1, suppliesDelta: -1, moraleDelta: 0 },
      { id: "inject", label: "Naehrstoff-Injektion", mode: "DECISION", costText: "-2 influence", gainText: "+Energie", riskText: "Mittel", hpDelta: 0, suppliesDelta: 1, moraleDelta: 0 },
      common.wait
    ],
    OPPORTUNITY_RAID: [
      { id: "raid", label: "Raid starten", mode: "COMBAT", costText: "-4 influence", gainText: "+Kontrolle", riskText: "Hoch", hpDelta: -1, suppliesDelta: 0, moraleDelta: 1 },
      { id: "hold", label: "Position halten", mode: "DECISION", costText: "-0", gainText: "+Stabil", riskText: "Mittel", hpDelta: 0, suppliesDelta: 0, moraleDelta: 0 }
    ],
    FOREIGN_MUTATION: [
      { id: "boost", label: "Mutation verstaerken", mode: "DECISION", costText: "-3 influence", gainText: "+Evolution", riskText: "Hoch", hpDelta: -1, suppliesDelta: 0, moraleDelta: 1 },
      { id: "suppress", label: "Mutation daempfen", mode: "DECISION", costText: "-2 influence", gainText: "+Stabilitaet", riskText: "Mittel", hpDelta: 0, suppliesDelta: 0, moraleDelta: 0 },
      common.wait
    ]
  };
  return table[id] || [
    { id: "stabilize", label: "Stabilisieren", mode: "DECISION", costText: "-1 influence", gainText: "+Kontrolle", riskText: "Mittel", hpDelta: 0, suppliesDelta: 0, moraleDelta: 1 },
    common.wait
  ];
}

function pickSubstrateEncounterId(state, rng, fallbackRoll) {
  const s = substrateFromState(state);
  const candidates = [];
  if ((s.toxinPct || 0) >= 45) candidates.push("TOXIN_FRONT", "TOXIN_BLOOM", "QUARANTINE_BREACH");
  if ((s.lightPct || 0) <= 30) candidates.push("HUNGER_WINTER");
  if ((s.lineageControlPct || 0) >= 55) candidates.push("DOMINANCE_PUSH", "OPPORTUNITY_RAID");
  if ((s.lineageControlPct || 0) >= 15 && (s.lineageControlPct || 0) <= 45 && (s.alivePct || 0) >= 35) candidates.push("SYMBIOSIS_WINDOW", "BRIDGE_STRAIN");
  if ((s.mutationLevel || 0) >= 4) candidates.push("METAMORPH_SPIKE", "FOREIGN_MUTATION", "RESONANCE_CORE");
  if ((s.alivePct || 0) <= 18) candidates.push("VACUUM_EDGE");
  if (candidates.length === 0) {
    const idx = rollForIndex(rng.sim, fallbackRoll + state.game.round + state.game.playerDistrict, 0, SUBSTRATE_ENCOUNTERS.length);
    return SUBSTRATE_ENCOUNTERS[idx]?.id || "TOXIN_FRONT";
  }
  const idx = rollForIndex(rng.world, fallbackRoll + state.game.round + candidates.length, 0, candidates.length);
  return candidates[idx] || candidates[0];
}

function encounterById(id) {
  const found = SUBSTRATE_ENCOUNTERS.find((e) => e.id === id) || SUBSTRATE_ENCOUNTERS[0];
  return {
    ...found,
    options: normalizeEncounterOptions(encounterOptionsById(found.id))
  };
}

function safeObj(v) {
  return v && typeof v === "object" ? v : {};
}

function toTextKV(obj, sign) {
  const pairs = Object.entries(safeObj(obj));
  if (pairs.length === 0) return "Keine";
  return pairs
    .map(([k, val]) => `${sign}${val} ${String(k).toLowerCase()}`)
    .join(", ");
}

function modeFromDecisionOption(optionId) {
  if (optionId === "force" || optionId === "ambush") return "COMBAT";
  return "DECISION";
}

function mapCatalogOption(option) {
  const costs = safeObj(option.costs);
  const rewards = safeObj(option.rewards);
  const hpDelta = (Number(rewards.HP || 0) - Number(costs.HP || 0)) | 0;
  const suppliesDelta = (Number(rewards.SUPPLIES || 0) - Number(costs.SUPPLIES || 0)) | 0;
  const moraleDelta = (Number(rewards.MORALE || 0) - Number(costs.MORALE || 0)) | 0;
  const ammoDelta = (Number(rewards.AMMO || 0) - Number(costs.AMMO || 0)) | 0;
  const medsDelta = (Number(rewards.MEDS || 0) - Number(costs.MEDS || 0)) | 0;
  const scrapDelta = (Number(rewards.SCRAP || 0) - Number(costs.SCRAP || 0)) | 0;
  const intelDelta = (Number(rewards.INTEL || 0) - Number(costs.INTEL || 0)) | 0;
  const creditsDelta = (Number(rewards.CREDITS || 0) - Number(costs.CREDITS || 0)) | 0;
  const progressDelta = (Number(rewards.progress || 0) - Number(costs.progress || 0)) | 0;
  const questProgressDelta = (Number(rewards.QUEST_PROGRESS || 0) - Number(costs.QUEST_PROGRESS || 0)) | 0;
  const mode = modeFromDecisionOption(option.id);
  const riskText = mode === "COMBAT" ? "Hoch (Kampf kann starten)" : "Mittel";
  return {
    id: String(option.id || ""),
    label: String(option.label || option.id || "Option"),
    mode,
    costText: toTextKV(costs, "-"),
    gainText: toTextKV(rewards, "+"),
    riskText,
    hpDelta,
    suppliesDelta,
    moraleDelta,
    ammoDelta,
    medsDelta,
    scrapDelta,
    intelDelta,
    creditsDelta,
    progressDelta,
    questProgressDelta
  };
}

function defaultEncounterOptionWait() {
  return {
    id: "wait",
    label: "Abwarten",
    mode: "DECISION",
    costText: "-0 influence",
    gainText: "+0",
    riskText: "Hoch",
    hpDelta: 0,
    suppliesDelta: 0,
    moraleDelta: -1,
    ammoDelta: 0,
    medsDelta: 0,
    scrapDelta: 0,
    intelDelta: 0,
    creditsDelta: 0,
    progressDelta: 0,
    questProgressDelta: 0
  };
}

function normalizeEncounterOptions(rawOptions) {
  const fallbackWait = defaultEncounterOptionWait();
  const list = Array.isArray(rawOptions) ? rawOptions : [];
  const normalized = [];
  const seen = new Set();
  for (const option of list) {
    if (!option || typeof option !== "object") continue;
    const id = String(option.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push({
      id,
      label: String(option.label || id),
      mode: option.mode === "COMBAT" ? "COMBAT" : "DECISION",
      costText: String(option.costText || ""),
      gainText: String(option.gainText || ""),
      riskText: String(option.riskText || ""),
      hpDelta: Number(option.hpDelta || 0) | 0,
      suppliesDelta: Number(option.suppliesDelta || 0) | 0,
      moraleDelta: Number(option.moraleDelta || 0) | 0,
      ammoDelta: Number(option.ammoDelta || 0) | 0,
      medsDelta: Number(option.medsDelta || 0) | 0,
      scrapDelta: Number(option.scrapDelta || 0) | 0,
      intelDelta: Number(option.intelDelta || 0) | 0,
      creditsDelta: Number(option.creditsDelta || 0) | 0,
      progressDelta: Number(option.progressDelta || 0) | 0,
      questProgressDelta: Number(option.questProgressDelta || 0) | 0
    });
    if (normalized.length >= 4) break;
  }
  while (normalized.length < 2) {
    const suffix = normalized.length === 0 ? "" : `_${normalized.length}`;
    const id = `wait${suffix}`;
    if (seen.has(id)) break;
    seen.add(id);
    normalized.push({ ...fallbackWait, id });
  }
  return normalized.slice(0, 4);
}

function pickDecisionScenario(state, rng) {
  const round = state.game.round;
  const district = state.game.playerDistrict;
  const filtered = DECISION_CATALOG.filter((cat) => {
    const minRound = Number.isFinite(cat.minRound) ? cat.minRound : 0;
    const maxRound = Number.isFinite(cat.maxRound) ? cat.maxRound : 9999;
    const minDistrict = Number.isFinite(cat.districtMin) ? cat.districtMin : 0;
    const maxDistrict = Number.isFinite(cat.districtMax) ? cat.districtMax : 9999;
    return round >= minRound && round <= maxRound && district >= minDistrict && district <= maxDistrict;
  });
  const pool = filtered.length > 0 ? filtered : DECISION_CATALOG;
  const idx = rollForIndex(rng.world, round + district + state.game.transit.progress, 0, pool.length);
  const cat = pool[idx] || pool[0] || DECISION_CATALOG[0];
  const options = normalizeEncounterOptions((cat.options || []).slice(0, 4).map(mapCatalogOption));
  return {
    id: cat.id || `catalog_${idx}`,
    text: cat.prompt || "Unklare Begegnung in den Ruinen.",
    options
  };
}

function countKeyItemsFromItems(items) {
  const owned = new Set((items || []).map((it) => it.id));
  let count = 0;
  for (const id of KEY_ITEM_IDS) if (owned.has(id)) count += 1;
  return count;
}

function containerKey(districtId, containerId) {
  return `${districtId}:${containerId}`;
}

function parseContainerKey(raw, fallbackDistrict) {
  const text = String(raw || "");
  const parts = text.split(":");
  if (parts.length === 2) {
    const districtId = Number(parts[0]);
    const containerId = parts[1];
    return { districtId: Number.isFinite(districtId) ? districtId : fallbackDistrict, containerId };
  }
  return { districtId: fallbackDistrict, containerId: text };
}

function containerRiskAndCost(type) {
  if (type === "LOCKER") return { cost: 1, risk: 0 };
  if (type === "CACHE") return { cost: 1, risk: 20 };
  if (type === "VAULT") return { cost: 2, risk: 50 };
  return { cost: 1, risk: 10 };
}

function applyResourceDropPatches(currentResources, drop) {
  const next = { ...currentResources };
  const out = [];
  const map = [
    ["SUPPLIES", "supplies"],
    ["AMMO", "ammo"],
    ["MEDS", "meds"],
    ["SCRAP", "scrap"],
    ["INTEL", "intel"],
    ["CREDITS", "credits"]
  ];
  for (const [srcKey, dstKey] of map) {
    const inc = Number((drop || {})[srcKey] || 0);
    if (!inc) continue;
    const upper = dstKey === "supplies" ? SUPPLIES_CAP : 999;
    next[dstKey] = clampInt((next[dstKey] || 0) + inc, 0, upper);
    out.push({ op: "set", path: `/game/resources/${dstKey}`, value: next[dstKey] });
  }
  return { patches: out, nextResources: next };
}

function moraleDamageBonus(morale) {
  if (morale >= 8) return 1;
  if (morale <= 3) return -1;
  return 0;
}

function evaluateEndState(stateLike) {
  const hp = stateLike.hp;
  const supplies = stateLike.supplies;
  const morale = stateLike.morale;
  if (hp <= 0) return { over: true, state: "LOSE", reason: "HP_ZERO", text: "Niederlage: Deine Wunden waren zu schwer." };
  if (supplies <= 0) return { over: true, state: "LOSE", reason: "SUPPLIES_ZERO", text: "Niederlage: Ohne Vorrat bricht der Trupp zusammen." };
  if (morale <= 0) return { over: true, state: "LOSE", reason: "MORALE_ZERO", text: "Niederlage: Die Moral ist vollstaendig gebrochen." };
  const influenceFailTicks = Number.isFinite(stateLike.influenceFailTicks)
    ? stateLike.influenceFailTicks
    : INFLUENCE_FAIL_TICKS;
  if (Number.isFinite(stateLike.zeroInfluenceTicks) && stateLike.zeroInfluenceTicks >= influenceFailTicks) {
    return { over: true, state: "LOSE", reason: "INFLUENCE_ZERO", text: "Niederlage: Einfluss zu lange auf Null." };
  }
  if (Number.isFinite(stateLike.alivePct) && stateLike.alivePct < 2) {
    return { over: true, state: "LOSE", reason: "WORLD_COLLAPSE", text: "Niederlage: Die lebende Matrix ist kollabiert." };
  }
  if (
    Number.isFinite(stateLike.lineageControlPct) &&
    Number.isFinite(stateLike.alivePct) &&
    stateLike.lineageControlPct <= 1 &&
    stateLike.alivePct <= 12
  ) {
    return { over: true, state: "LOSE", reason: "LINEAGE_EXTINCTION", text: "Niederlage: Die Linie ist zusammengebrochen und kann sich nicht mehr tragen." };
  }

  const keyItems = stateLike.keyItems || 0;
  const combatsWon = stateLike.combatsWon || 0;
  if (keyItems >= 3 && stateLike.playerDistrict === 4) {
    return { over: true, state: "WIN", reason: "CENTRAL_HUB_ESCAPE", text: "Sieg: Signal aktiviert und Fluchtfenster am Aschekreuz gesichert." };
  }
  if (
    Number.isFinite(stateLike.lineageControlPct) &&
    stateLike.lineageControlPct >= 80 &&
    combatsWon >= 6 &&
    (stateLike.playerDistrict || 0) >= 5
  ) {
    return { over: true, state: "WIN", reason: "DOMINANCE_PATH", text: "Sieg: Dominanzpfad abgeschlossen. Die Linie kontrolliert die Unterstadt." };
  }
  if (
    Number.isFinite(stateLike.alivePct) &&
    Number.isFinite(stateLike.lightPct) &&
    Number.isFinite(stateLike.toxinPct) &&
    Number.isFinite(stateLike.lineageControlPct) &&
    (stateLike.round || 0) >= 22 &&
    stateLike.alivePct >= 70 &&
    stateLike.lightPct >= 65 &&
    stateLike.toxinPct <= 25 &&
    stateLike.lineageControlPct >= 25 &&
    stateLike.lineageControlPct <= 70
  ) {
    return { over: true, state: "WIN", reason: "SYMBIOSIS_PATH", text: "Sieg: Symbiosepfad erreicht. Stabilitaet und Balance wurden gehalten." };
  }
  if (
    Number.isFinite(stateLike.mutationLevel) &&
    Number.isFinite(stateLike.toxinPct) &&
    Number.isFinite(stateLike.alivePct) &&
    Number.isFinite(stateLike.lineageControlPct) &&
    stateLike.mutationLevel >= 8 &&
    stateLike.toxinPct >= 20 &&
    stateLike.toxinPct <= 75 &&
    stateLike.alivePct >= 35 &&
    (stateLike.lineageControlPct >= 40 || combatsWon >= 4)
  ) {
    return { over: true, state: "WIN", reason: "METAMORPHOSIS_PATH", text: "Sieg: Metamorphosepfad stabilisiert. Die Linie adaptiert ohne Kollaps." };
  }
  if ((stateLike.round || 0) >= 30) {
    return { over: true, state: "WIN", reason: "SURVIVAL_MASTER", text: "Sieg: 30 Runden in der Zone ueberlebt." };
  }
  if (combatsWon >= 10 && stateLike.playerDistrict === 6) {
    return { over: true, state: "WIN", reason: "WARLORD_PATH", text: "Sieg: Unterstadt durch Kampfdominanzen gesichert." };
  }
  return { over: false, state: "ONGOING", reason: "", text: "" };
}

function fallbackInstanceId(item, index = 0) {
  const baseId = Number.isFinite(item?.id) ? item.id : 0;
  return `legacy_${baseId}_${Math.max(0, index | 0)}`;
}

function withInstanceId(item, index = 0) {
  if (!item || typeof item !== "object") return null;
  const instanceId = typeof item.instanceId === "string" && item.instanceId.trim().length > 0
    ? item.instanceId
    : fallbackInstanceId(item, index);
  return { ...item, instanceId };
}

function normalizeInventoryItems(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => withInstanceId(it, idx)).filter(Boolean);
}

function nextInstanceIdForItem(items, itemId) {
  const list = normalizeInventoryItems(items);
  let count = 0;
  for (const it of list) if (it.id === itemId) count += 1;
  return `it_${itemId}_${count + 1}_${list.length + 1}`;
}

function cloneItem(id, currentItems = []) {
  const item = itemById(id);
  if (!item) return null;
  return withInstanceId({ ...item, instanceId: nextInstanceIdForItem(currentItems, item.id) }, currentItems.length);
}

function loadoutDefinition(raw) {
  const key = String(raw || "SURVIVOR").toUpperCase();
  if (key === "SCAVENGER") {
    return {
      name: "SCAVENGER",
      trait: "SCOUT_LOOT_PLUS",
      itemIds: [2, 5, 5],
      hp: 8,
      supplies: 7,
      morale: 5,
      text: "Loadout SCAVENGER aktiv: Du priorisierst Fundrouten und Vorrat."
    };
  }
  if (key === "FIGHTER") {
    return {
      name: "FIGHTER",
      trait: "RETREAT_SUPPLIES",
      itemIds: [1, 3],
      hp: 12,
      supplies: 4,
      morale: 4,
      text: "Loadout FIGHTER aktiv: Du gehst mit Stahl und Haltung voraus."
    };
  }
  return {
    name: "SURVIVOR",
    trait: "MORALE_DECAY_HALF",
    itemIds: [4, 4, 3],
    hp: 10,
    supplies: 6,
    morale: 6,
    text: "Loadout SURVIVOR aktiv: Du stabilisierst den Trupp fuer lange Runs."
  };
}

function dynamicEnemyFromState(state, rng, pressureBonus = 0) {
  const level = Math.max(1, 1 + Math.floor(state.game.round / 3) + Math.floor(state.game.transit.progress / 35) + pressureBonus);
  const district = state.game.playerDistrict;
  const profile = DISTRICT_PROFILE.find((d) => d.id === district);
  const poolIds = (profile?.enemyPool || []).filter(Boolean);
  const fallbackIds = ["raider_ash", "hunter_marek", "scav_veil"];
  const ids = poolIds.length > 0 ? poolIds : fallbackIds;
  const pickIdx = rollForIndex(rng.world, state.game.round + district + pressureBonus + ids.length, 0, ids.length);
  const enemyCode = ids[pickIdx];
  const cat = ENEMY_CATALOG.find((e) => e.id === enemyCode) || ENEMY_CATALOG[0];
  const variance = rollForIndex(rng.sim, state.game.round + level + pressureBonus, -1, 3);
  const hp = Math.min(34, Math.max(4, (cat?.hp || 6) + Math.floor(level / 2) + variance));
  let enemyId = "RAIDER";
  if (cat?.archetype === "HUNTER") enemyId = "HUNTER";
  else if (cat?.archetype === "SCAV") enemyId = "SCAVENGER";
  else if (cat?.archetype === "BOSS") enemyId = "BOSS";
  else if ((cat?.districtTier || 0) >= 4) enemyId = "MUTANT";
  const enemyName = `${cat?.name || "Unbekannter Kontakt"} L${level}`;
  return { enemyName, hp, enemyId, enemyTier: Math.min(10, Math.max(level, cat?.districtTier || 1)) };
}

function combatIntro(enemyName, scripted) {
  if (scripted) return `Erstkontakt: ${enemyName}. Oben siehst du dauerhafte Lebensbalken. Waehle zuerst ein Item, dann gehst du in den Kampf.`;
  return `${enemyName} stellt sich in den Weg. Waehle ein Item und starte den Kampf.`;
}

function beginCombatPatches(state, enemyName, enemyHp, scripted, eventText, enemyId = "RAIDER", enemyTier = 1) {
  return [
    { op: "set", path: "/game/combat/active", value: true },
    { op: "set", path: "/game/combat/phase", value: "PREP" },
    { op: "set", path: "/game/combat/enemyId", value: enemyId },
    { op: "set", path: "/game/combat/enemyName", value: enemyName },
    { op: "set", path: "/game/combat/enemyTier", value: enemyTier },
    { op: "set", path: "/game/combat/enemyHp", value: enemyHp },
    { op: "set", path: "/game/combat/enemyMaxHp", value: enemyHp },
    { op: "set", path: "/game/combat/introText", value: combatIntro(enemyName, scripted) },
    { op: "set", path: "/game/combat/tick", value: 0 },
    { op: "set", path: "/game/combat/logLines", value: [] },
    { op: "set", path: "/game/combat/pendingLootItemIds", value: [] },
    { op: "set", path: "/game/combat/lastOutcome", value: "NONE" },
    { op: "set", path: "/game/panelMode", value: "KAMPF" },
    { op: "set", path: "/game/panelAnim", value: state.game.panelAnim + 1 },
    { op: "set", path: "/game/lastEvent", value: eventText },
    { op: "push", path: "/game/log", value: eventText }
  ];
}

function lootDistrictPatches(state, districtId) {
  if (state.game.inventory.lootedDistricts.includes(districtId)) return [];
  const itemId = districtLootItemId(districtId);
  if (!itemId) return [];
  const item = itemById(itemId);
  if (!item) return [];
  return [
    { op: "push", path: "/game/inventory/items", value: cloneItem(item.id, state.game.inventory.items) },
    { op: "push", path: "/game/inventory/lootedDistricts", value: districtId },
    { op: "set", path: "/game/lastEvent", value: `Gefunden: ${item.name} (${item.effect})` },
    { op: "push", path: "/game/log", value: `Loot in ${findDistrict(districtId)?.name ?? districtId}: ${item.name}` }
  ];
}

function selectedItemFromState(state) {
  const items = normalizeInventoryItems(state.game.inventory.items);
  const selectedInstanceId = String(state.game.inventory.selectedCombatItemInstanceId || "");
  if (selectedInstanceId) {
    const byInstance = items.find((it) => it.instanceId === selectedInstanceId);
    if (byInstance) return byInstance;
  }
  const id = state.game.inventory.selectedCombatItemId;
  return items.find((it) => it.id === id) || null;
}

function removeFirstItemBySelection(items, selection) {
  const list = normalizeInventoryItems(items);
  const selectedInstanceId = String(selection?.instanceId || "");
  if (selectedInstanceId) {
    const idxByInstance = list.findIndex((it) => it.instanceId === selectedInstanceId);
    if (idxByInstance >= 0) return [...list.slice(0, idxByInstance), ...list.slice(idxByInstance + 1)];
  }
  const selectedItemId = Number(selection?.id ?? -1);
  const idx = list.findIndex((it) => it.id === selectedItemId);
  if (idx < 0) return items;
  return [...list.slice(0, idx), ...list.slice(idx + 1)];
}

function clampInt(v, min, max) {
  const n = Number.isFinite(v) ? Math.trunc(v) : 0;
  return Math.max(min, Math.min(max, n));
}

function applyQuestProgress(questsState, delta) {
  const amount = clampInt(delta, -100, 100);
  const active = Array.isArray(questsState?.active) ? questsState.active.slice() : [];
  if (!amount || active.length === 0) return active;
  const tracked = String(questsState?.trackedQuestId || "");
  let idx = active.findIndex((q) => q?.id === tracked && q?.status === "ACTIVE");
  if (idx < 0) idx = active.findIndex((q) => q?.status === "ACTIVE");
  if (idx < 0) return active;
  const quest = active[idx] || {};
  const goal = clampInt(quest.goal ?? 100, 1, 100);
  const nextProgress = clampInt((quest.progress || 0) + amount, 0, goal);
  active[idx] = { ...quest, progress: nextProgress };
  return active;
}

function syncedSuppliesPatches(v) {
  const supplies = clampInt(v, 0, SUPPLIES_CAP);
  return [
    { op: "set", path: "/game/supplies", value: supplies },
    { op: "set", path: "/game/resources/supplies", value: supplies }
  ];
}

function appendCombatLine(lines, text) {
  const next = [...(Array.isArray(lines) ? lines : []), text];
  return next.slice(-3);
}

function maybeCombatLootItemIds(nextState, rng) {
  const dropRoll = rollForIndex(rng.world, nextState.game.round + nextState.game.combat.enemyMaxHp + nextState.game.combat.tick, 0, 100);
  const chance = Math.min(85, 25 + nextState.game.combat.enemyMaxHp * 3);
  if (dropRoll >= chance) return [];
  const table = nextState.game.round >= 6 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5];
  const idx = rollForIndex(rng.cos, nextState.game.round + nextState.game.combat.enemyMaxHp, 0, table.length);
  return [table[idx]];
}

export function reducer(state, action, { rng }) {
  switch (action.type) {
    case "START_GAME":
      if (state.app.firstStart) {
        return [
          { op: "set", path: "/ui/screen", value: "RULES" },
          { op: "set", path: "/app/firstStart", value: false }
        ];
      }
      return [{ op: "set", path: "/ui/screen", value: "GAME" }];

    case "SET_RELEASE_PROFILE": {
      const profile = normalizeReleaseProfile(action.payload?.profile);
      const flags = featureFlagsForProfile(profile);
      return [
        { op: "set", path: "/app/releaseProfile", value: profile },
        { op: "set", path: "/app/featureFlags/autoResolveEncounterTimeout", value: flags.autoResolveEncounterTimeout },
        { op: "set", path: "/app/featureFlags/strictInfluenceDefeat", value: flags.strictInfluenceDefeat },
        { op: "set", path: "/app/featureFlags/enableRaidIntervention", value: flags.enableRaidIntervention },
        { op: "set", path: "/game/lastEvent", value: `Release-Profil aktiv: ${profile}.` },
        { op: "push", path: "/game/log", value: `Profile set: ${profile}` }
      ];
    }

    case "ACCEPT_RULES":
      return [
        { op: "set", path: "/ui/screen", value: "LOADOUT_SELECTION" },
        { op: "set", path: "/dialog/active", value: false },
        { op: "set", path: "/dialog/step", value: 0 }
      ];

    case "NEXT_DIALOG": {
      if (!state.dialog.active) return [];
      const nextStep = state.dialog.step + 1;
      if (nextStep >= 3) {
        return [
          { op: "set", path: "/dialog/active", value: false },
          { op: "set", path: "/ui/screen", value: "GAME" }
        ];
      }
      return [{ op: "set", path: "/dialog/step", value: nextStep }];
    }

    case "BACK_TO_MENU":
      return [
        { op: "set", path: "/ui/screen", value: "MAIN_MENU" },
        { op: "set", path: "/dialog/active", value: false }
      ];

    case "OPEN_ITEM_DETAIL":
      return [{ op: "set", path: "/game/inventory/detailItemId", value: action.payload.itemId }];

    case "CLOSE_ITEM_DETAIL":
      return [{ op: "set", path: "/game/inventory/detailItemId", value: -1 }];

    case "SELECT_COMBAT_ITEM":
      {
        const items = normalizeInventoryItems(state.game.inventory.items);
        const payloadInstanceId = String(action.payload?.instanceId || "");
        const payloadItemId = Number(action.payload?.itemId ?? -1);
        const selected = payloadInstanceId
          ? items.find((it) => it.instanceId === payloadInstanceId)
          : items.find((it) => it.id === payloadItemId);
        return [
          { op: "set", path: "/game/inventory/items", value: items },
          { op: "set", path: "/game/inventory/selectedCombatItemId", value: selected ? selected.id : -1 },
          { op: "set", path: "/game/inventory/selectedCombatItemInstanceId", value: selected ? selected.instanceId : "" }
        ];
      }

    case "EQUIP_LOADOUT": {
      const slot = String(action.payload?.slot || "");
      const itemId = Number(action.payload?.itemId ?? -1);
      const item = state.game.inventory.items.find((it) => it.id === itemId);
      if (!item) return [];
      if (!slot || item.slot !== slot || slot === "NONE") return [];
      return [
        { op: "set", path: `/game/loadout/slots/${slot}`, value: item.id },
        { op: "set", path: "/game/loadout/lastEquippedItemId", value: item.id }
      ];
    }

    case "UNEQUIP_LOADOUT": {
      const slot = String(action.payload?.slot || "");
      if (!slot || !(slot in state.game.loadout.slots)) return [];
      return [{ op: "set", path: `/game/loadout/slots/${slot}`, value: -1 }];
    }

    case "APPLY_RESOURCE_DELTA": {
      const cur = state.game.resources;
      const next = {
        supplies: clampInt((state.game.supplies || 0) + (action.payload?.supplies || 0), 0, SUPPLIES_CAP),
        ammo: clampInt((cur.ammo || 0) + (action.payload?.ammo || 0), 0, 999),
        meds: clampInt((cur.meds || 0) + (action.payload?.meds || 0), 0, 999),
        scrap: clampInt((cur.scrap || 0) + (action.payload?.scrap || 0), 0, 999),
        intel: clampInt((cur.intel || 0) + (action.payload?.intel || 0), 0, 999),
        credits: clampInt((cur.credits || 0) + (action.payload?.credits || 0), 0, 999)
      };
      return [
        ...syncedSuppliesPatches(next.supplies),
        { op: "set", path: "/game/resources/ammo", value: next.ammo },
        { op: "set", path: "/game/resources/meds", value: next.meds },
        { op: "set", path: "/game/resources/scrap", value: next.scrap },
        { op: "set", path: "/game/resources/intel", value: next.intel },
        { op: "set", path: "/game/resources/credits", value: next.credits }
      ];
    }

    case "QUEUE_DECISION": {
      const decisionId = String(action.payload?.decisionId || "").trim();
      if (!decisionId) return [];
      const chainId = String(action.payload?.chainId || state.game.decisions.chainId || "").trim();
      const queue = Array.isArray(state.game.decisions.queue) ? state.game.decisions.queue.slice() : [];
      if (!queue.includes(decisionId)) queue.push(decisionId);
      const activeDecisionId = state.game.decisions.activeDecisionId || queue[0] || "";
      return [
        { op: "set", path: "/game/decisions/activeDecisionId", value: activeDecisionId },
        { op: "set", path: "/game/decisions/chainId", value: chainId },
        { op: "set", path: "/game/decisions/queue", value: queue },
        { op: "set", path: "/game/lastEvent", value: `Decision gequeued: ${decisionId}` },
        { op: "push", path: "/game/log", value: `Decision Queue + ${decisionId}` }
      ];
    }

    case "RESOLVE_DECISION_OUTCOME": {
      const decisionId = String(action.payload?.decisionId || "").trim();
      const optionId = String(action.payload?.optionId || "").trim();
      const outcome = String(action.payload?.outcome || "SUCCESS").trim();
      if (!decisionId) return [];
      const queued = Array.isArray(state.game.decisions.queue) ? state.game.decisions.queue : [];
      const activeDecisionId = state.game.decisions.activeDecisionId || "";
      const alreadyResolved = (state.game.decisions.history || []).some((h) => h.decisionId === decisionId);
      const isKnown = decisionId === activeDecisionId || queued.includes(decisionId);
      if (!isKnown || alreadyResolved) return [];

      const queue = queued.filter((id) => id !== decisionId);
      const nextActive = queue[0] || "";
      const historyEntry = { decisionId, optionId, outcome, round: state.game.round };

      const deltas = {
        SUCCESS: { supplies: 1, intel: 1, credits: 0, ammo: 0, meds: 0, scrap: 0 },
        PARTIAL: { supplies: 1, intel: 0, credits: 0, ammo: 0, meds: 0, scrap: 0 },
        FAIL: { supplies: -1, intel: 0, credits: 0, ammo: 0, meds: 0, scrap: 0 },
        CRITICAL: { supplies: 2, intel: 2, credits: 1, ammo: 0, meds: 0, scrap: 0 }
      }[outcome] || { supplies: 0, intel: 0, credits: 0, ammo: 0, meds: 0, scrap: 0 };

      const res = state.game.resources;
      const nextRes = {
        supplies: clampInt((state.game.supplies || 0) + deltas.supplies, 0, SUPPLIES_CAP),
        ammo: clampInt((res.ammo || 0) + deltas.ammo, 0, 999),
        meds: clampInt((res.meds || 0) + deltas.meds, 0, 999),
        scrap: clampInt((res.scrap || 0) + deltas.scrap, 0, 999),
        intel: clampInt((res.intel || 0) + deltas.intel, 0, 999),
        credits: clampInt((res.credits || 0) + deltas.credits, 0, 999)
      };

      return [
        { op: "set", path: "/game/decisions/activeDecisionId", value: nextActive },
        { op: "set", path: "/game/decisions/history", value: [...state.game.decisions.history, historyEntry] },
        { op: "set", path: "/game/decisions/lastOutcome", value: outcome },
        { op: "set", path: "/game/decisions/queue", value: queue },
        ...syncedSuppliesPatches(nextRes.supplies),
        { op: "set", path: "/game/resources/ammo", value: nextRes.ammo },
        { op: "set", path: "/game/resources/meds", value: nextRes.meds },
        { op: "set", path: "/game/resources/scrap", value: nextRes.scrap },
        { op: "set", path: "/game/resources/intel", value: nextRes.intel },
        { op: "set", path: "/game/resources/credits", value: nextRes.credits },
        { op: "inc", path: "/game/stats/decisionsMade", amount: 1 },
        { op: "set", path: "/game/lastEvent", value: `Decision ${decisionId} -> ${outcome}` },
        { op: "push", path: "/game/log", value: `Decision resolved: ${decisionId}/${optionId || "-"} (${outcome})` }
      ];
    }

    case "REGISTER_LOOT_CONTAINER": {
      const districtId = Number(action.payload?.districtId ?? state.game.playerDistrict);
      const containerId = String(action.payload?.containerId || "").trim();
      if (!containerId) return [];
      const key = containerKey(districtId, containerId);
      if (state.game.lootContainers.discovered.includes(key)) {
        return [{ op: "set", path: "/game/lootContainers/activeContainerId", value: key }];
      }
      return [
        { op: "set", path: "/game/lootContainers/activeContainerId", value: key },
        { op: "push", path: "/game/lootContainers/discovered", value: key },
        { op: "set", path: "/game/lastEvent", value: `Container entdeckt: ${key}` },
        { op: "push", path: "/game/log", value: `Container registriert: ${key}` }
      ];
    }

    case "UPDATE_QUEST": {
      const questId = String(action.payload?.questId || "").trim();
      if (!questId) return [];
      const status = String(action.payload?.status || "ACTIVE");
      const progress = clampInt(action.payload?.progress ?? 0, 0, 100);

      const active = Array.isArray(state.game.quests.active) ? state.game.quests.active.slice() : [];
      const completed = Array.isArray(state.game.quests.completedIds) ? state.game.quests.completedIds.slice() : [];
      const failed = Array.isArray(state.game.quests.failedIds) ? state.game.quests.failedIds.slice() : [];

      const idx = active.findIndex((q) => q.id === questId);
      const base = idx >= 0 ? active[idx] : { id: questId, title: questId, goal: 100 };

      if (status === "ACTIVE") {
        const nextQuest = { ...base, id: questId, status, progress, title: base.title || questId, goal: base.goal || 100 };
        if (idx >= 0) active[idx] = nextQuest;
        else active.push(nextQuest);
      } else {
        if (idx >= 0) active.splice(idx, 1);
      }

      if (status === "ACTIVE") {
        const cidx = completed.indexOf(questId);
        if (cidx >= 0) completed.splice(cidx, 1);
        const fidx = failed.indexOf(questId);
        if (fidx >= 0) failed.splice(fidx, 1);
      }
      if (status === "COMPLETED" && !completed.includes(questId)) completed.push(questId);
      if (status === "FAILED" && !failed.includes(questId)) failed.push(questId);
      if (status === "COMPLETED") {
        const fidx = failed.indexOf(questId);
        if (fidx >= 0) failed.splice(fidx, 1);
      }
      if (status === "FAILED") {
        const cidx = completed.indexOf(questId);
        if (cidx >= 0) completed.splice(cidx, 1);
      }

      const patches = [
        { op: "set", path: "/game/quests/trackedQuestId", value: questId },
        { op: "set", path: "/game/quests/active", value: active },
        { op: "set", path: "/game/quests/completedIds", value: completed },
        { op: "set", path: "/game/quests/failedIds", value: failed },
        { op: "set", path: "/game/lastEvent", value: `Quest ${questId}: ${status} (${progress}%)` },
        { op: "push", path: "/game/log", value: `Quest update: ${questId} -> ${status} (${progress}%)` }
      ];
      if (status === "COMPLETED" && !state.game.quests.completedIds.includes(questId)) {
        patches.push({ op: "inc", path: "/game/stats/questsCompleted", amount: 1 });
      }
      return patches;
    }

    case "CHOOSE_LOADOUT": {
      if (state.ui.screen !== "LOADOUT_SELECTION" || state.game.round > 0 || state.game.transit.active || state.game.combat.active || state.game.encounter.active) return [];
      const choice = action.payload?.loadout || action.payload?.choice || action.payload?.id;
      const loadout = loadoutDefinition(choice);
      const items = [];
      for (const id of loadout.itemIds) {
        const clone = cloneItem(id, items);
        if (clone) items.push(clone);
      }
      const selectedCombatItemId = items[0]?.id ?? -1;
      const selectedCombatItemInstanceId = items[0]?.instanceId ?? "";
      return [
        { op: "set", path: "/ui/screen", value: "DIALOG" },
        { op: "set", path: "/dialog/active", value: true },
        { op: "set", path: "/dialog/step", value: 0 },
        { op: "set", path: "/game/inventory/items", value: items },
        { op: "set", path: "/game/inventory/selectedCombatItemId", value: selectedCombatItemId },
        { op: "set", path: "/game/inventory/selectedCombatItemInstanceId", value: selectedCombatItemInstanceId },
        { op: "set", path: "/game/maxHp", value: loadout.hp },
        { op: "set", path: "/game/hp", value: loadout.hp },
        ...syncedSuppliesPatches(loadout.supplies),
        { op: "set", path: "/game/morale", value: loadout.morale },
        { op: "set", path: "/game/archetype", value: loadout.name },
        { op: "set", path: "/game/archetypeTrait", value: loadout.trait },
        { op: "set", path: "/game/lastChoice", value: `LOADOUT:${loadout.name}` },
        { op: "set", path: "/game/lastEvent", value: loadout.text },
        { op: "push", path: "/game/log", value: loadout.text }
      ];
    }

    case "BEGIN_COMBAT": {
      if (!state.game.combat.active || state.game.combat.phase !== "PREP" || state.game.over) return [];
      const item = selectedItemFromState(state);
      let hp = state.game.hp;
      let supplies = state.game.supplies;
      const patches = [];
      let selectedPower = 0;
      let selectedKind = "";

      if (item) {
        selectedKind = item.kind;
        selectedPower = item.power;
        if (item.kind === "CONSUMABLE") {
          if (item.effect.includes("Heilt")) hp = Math.min(state.game.maxHp, hp + item.power);
          if (item.effect.includes("Vorrat")) supplies = Math.min(SUPPLIES_CAP, supplies + item.power);
          const remaining = removeFirstItemBySelection(state.game.inventory.items, item);
          patches.push({ op: "set", path: "/game/inventory/items", value: remaining });
        }
      }

      patches.push(
        { op: "set", path: "/game/hp", value: hp },
        ...syncedSuppliesPatches(supplies),
        { op: "set", path: "/game/combat/phase", value: "ACTIVE" },
        { op: "set", path: "/game/combat/emergencyUsed", value: false },
        { op: "set", path: "/game/combat/emergencyPenalty", value: false },
        { op: "set", path: "/game/combat/logLines", value: [] },
        { op: "set", path: "/game/combat/selectedItemPower", value: selectedPower },
        { op: "set", path: "/game/combat/selectedItemKind", value: selectedKind },
        { op: "set", path: "/game/inventory/selectedCombatItemId", value: -1 },
        { op: "set", path: "/game/inventory/selectedCombatItemInstanceId", value: "" },
        { op: "inc", path: "/game/stats/combatsStarted", amount: 1 },
        { op: "set", path: "/game/lastEvent", value: "Kampf beginnt. Halte die Linie." },
        { op: "push", path: "/game/log", value: "Kampfphase gestartet." }
      );
      return patches;
    }

    case "USE_EMERGENCY_ITEM": {
      if (!state.game.combat.active || state.game.combat.phase !== "ACTIVE" || state.game.over) return [];
      if (state.game.combat.emergencyUsed) return [];

      const inventoryItems = normalizeInventoryItems(state.game.inventory.items);
      const selectedInstanceId = String(state.game.inventory.selectedCombatItemInstanceId || "");
      const selected = inventoryItems.find((it) => it.instanceId === selectedInstanceId && it.kind === "CONSUMABLE");
      const fallback = inventoryItems.find((it) => it.kind === "CONSUMABLE");
      const item = selected || fallback;
      if (!item) return [];

      let hp = state.game.hp;
      let supplies = state.game.supplies;
      let morale = state.game.morale;

      if (item.effect.includes("Heilt")) hp = Math.min(state.game.maxHp, hp + item.power);
      if (item.effect.includes("Vorrat")) supplies = Math.min(SUPPLIES_CAP, supplies + item.power);
      if (item.effect.includes("Moral")) morale = Math.min(MORALE_CAP, morale + item.power);

      const remaining = removeFirstItemBySelection(inventoryItems, item);
      return [
        { op: "set", path: "/game/hp", value: hp },
        ...syncedSuppliesPatches(supplies),
        { op: "set", path: "/game/morale", value: morale },
        { op: "set", path: "/game/inventory/items", value: remaining },
        { op: "set", path: "/game/combat/emergencyUsed", value: true },
        { op: "set", path: "/game/combat/emergencyPenalty", value: true },
        { op: "set", path: "/game/lastEvent", value: `Notfallnutzung: ${item.name}. Der Gegner drueckt sofort nach.` },
        { op: "push", path: "/game/log", value: `Emergency Use: ${item.name} (Gegner bekommt Extrahieb).` }
      ];
    }

    case "CHANGE_STANCE": {
      if (!state.game.combat.active || state.game.combat.phase !== "PREP" || state.game.over) return [];
      const stance = action.payload?.stance || "BALANCED";
      return [
        { op: "set", path: "/game/combat/stance", value: stance },
        { op: "set", path: "/game/lastEvent", value: `Kampfhaltung: ${stance}.` },
        { op: "push", path: "/game/log", value: `Stance gewechselt: ${stance}` }
      ];
    }

    case "RETREAT_FROM_COMBAT": {
      if (!state.game.combat.active || state.game.combat.phase !== "ACTIVE" || state.game.over) return [];
      if (state.game.hp <= 2) return [];
      if (state.game.combat.enemyHp <= Math.floor(state.game.combat.enemyMaxHp / 2)) return [];
      const fighter = state.game.archetype === "FIGHTER";
      const hp = fighter ? state.game.hp : Math.max(0, state.game.hp - 2);
      const supplies = fighter ? Math.max(0, state.game.supplies - 2) : state.game.supplies;
      const end = evaluateEndState({
        hp,
        supplies,
        morale: state.game.morale,
        round: state.game.round,
        playerDistrict: state.game.playerDistrict,
        keyItems: countKeyItemsFromItems(state.game.inventory.items),
        combatsWon: state.game.stats.combatsWon,
        influenceFailTicks: influenceFailTicksForState(state)
      });
      const patches = [
        { op: "set", path: "/game/hp", value: hp },
        ...syncedSuppliesPatches(supplies),
        { op: "set", path: "/game/combat/phase", value: "RESOLVED" },
        { op: "set", path: "/game/combat/active", value: false },
        { op: "set", path: "/game/combat/lastOutcome", value: "FLEE" },
        { op: "set", path: "/game/panelMode", value: "KAMPF" },
        { op: "set", path: "/game/panelAnim", value: state.game.panelAnim + 1 },
        { op: "set", path: "/game/over", value: end.over },
        { op: "set", path: "/game/lastEvent", value: fighter ? "Rueckzug erfolgreich. -2 Supplies." : "Rueckzug erfolgreich. -2 HP." },
        { op: "push", path: "/game/log", value: "Kampf abgebrochen: kontrollierter Rueckzug." }
      ];
      if (end.over) {
        patches.push(
          { op: "set", path: "/game/winLose/state", value: end.state },
          { op: "set", path: "/game/winLose/reason", value: end.reason },
          { op: "set", path: "/game/winLose/reachedAtRound", value: state.game.round },
          { op: "set", path: "/game/lastEvent", value: end.text },
          { op: "push", path: "/game/log", value: end.text }
        );
      }
      return patches;
    }

    case "COLLECT_COMBAT_LOOT": {
      if (state.game.combat.pendingLootItemIds.length === 0) return [];
      const clones = [];
      for (const id of state.game.combat.pendingLootItemIds) {
        const clone = cloneItem(id, [...state.game.inventory.items, ...clones]);
        if (clone) clones.push(clone);
      }
      if (clones.length === 0) {
        return [
          { op: "set", path: "/game/combat/pendingLootItemIds", value: [] },
          { op: "set", path: "/game/combat/phase", value: "NONE" }
        ];
      }
      const names = clones.map((it) => it.name).join(", ");
      return [
        { op: "set", path: "/game/inventory/items", value: [...state.game.inventory.items, ...clones] },
        { op: "set", path: "/game/combat/pendingLootItemIds", value: [] },
        { op: "set", path: "/game/combat/phase", value: "NONE" },
        { op: "set", path: "/game/lastEvent", value: `Loot gesichert: ${names}.` },
        { op: "push", path: "/game/log", value: `Loot aufgenommen: ${names}` }
      ];
    }

    case "OPEN_LOOT_CONTAINER": {
      if (state.ui.screen !== "GAME" || state.game.over || state.game.transit.active || state.game.encounter.active || state.game.combat.active) return [];
      const parsed = parseContainerKey(action.payload?.containerId, state.game.playerDistrict);
      const districtId = parsed.districtId;
      const containerId = parsed.containerId;
      if (!containerId) return [];
      const districtContainers = DISTRICT_LOOT_CONTAINERS[districtId] || [];
      if (!districtContainers.includes(containerId)) return [];
      const key = containerKey(districtId, containerId);
      if (state.game.lootContainers.opened.includes(key)) return [];

      const def = lootContainerById(containerId);
      if (!def) return [];
      const isHidden = containerId === "vault_black";
      if (isHidden && !state.game.lootContainers.discovered.includes(key)) return [];

      const cfg = containerRiskAndCost(def.type);
      const suppliesAfterCost = Math.max(0, state.game.supplies - cfg.cost);
      const riskRoll = rollForIndex(rng.sim, state.game.round + districtId + containerId.length, 0, 100);

      const patches = [
        { op: "set", path: "/game/lootContainers/activeContainerId", value: key },
        ...syncedSuppliesPatches(suppliesAfterCost)
      ];

      const didTriggerFight = riskRoll < cfg.risk;
      if (didTriggerFight) {
        const enemy = dynamicEnemyFromState(state, rng, 1);
        patches.push(
          { op: "push", path: "/game/lootContainers/sealed", value: key },
          { op: "set", path: "/game/lastEvent", value: `${containerId} ausgeloest: Kontakt im Nahbereich.` },
          { op: "push", path: "/game/log", value: `Container-Risiko triggert Kampf (${containerId}).` },
          ...beginCombatPatches(state, enemy.enemyName, enemy.hp, false, "Beim Oeffnen schlaegt ein Gegner aus dem Schatten zu.", enemy.enemyId, enemy.enemyTier)
        );
        return patches;
      }

      const itemIds = [...(def.guaranteedItemIds || [])];
      const possible = def.possibleItemIds || [];
      if (possible.length > 0) {
        const idx = rollForIndex(rng.world, state.game.round + districtId + suppliesAfterCost, 0, possible.length);
        itemIds.push(possible[idx]);
      }
      const clones = [];
      for (const id of itemIds) {
        const clone = cloneItem(id, [...state.game.inventory.items, ...clones]);
        if (clone) clones.push(clone);
      }
      const nextItems = [...state.game.inventory.items, ...clones];
      const resourceBase = { ...state.game.resources, supplies: suppliesAfterCost };
      const res = applyResourceDropPatches(resourceBase, def.resourceDrops);
      const suppliesAfterDrop = clampInt(res.nextResources.supplies, 0, SUPPLIES_CAP);
      const names = clones.map((it) => it.name).join(", ");
      const end = evaluateEndState({
        hp: state.game.hp,
        supplies: suppliesAfterDrop,
        morale: state.game.morale,
        round: state.game.round,
        playerDistrict: state.game.playerDistrict,
        keyItems: countKeyItemsFromItems(nextItems),
        combatsWon: state.game.stats.combatsWon,
        influenceFailTicks: influenceFailTicksForState(state)
      });
      patches.push(
        { op: "set", path: "/game/inventory/items", value: nextItems },
        { op: "push", path: "/game/lootContainers/opened", value: key },
        { op: "push", path: "/game/inventory/openedContainerIds", value: key },
        { op: "inc", path: "/game/stats/containersOpened", amount: 1 },
        ...syncedSuppliesPatches(suppliesAfterDrop),
        ...res.patches,
        { op: "set", path: "/game/lastEvent", value: `Container geoeffnet: ${names || "Rohstoffe"}.` },
        { op: "push", path: "/game/log", value: `Loot aus ${containerId}: ${names || "Rohstoffe"}` },
        { op: "set", path: "/game/over", value: end.over },
        { op: "set", path: "/game/winLose/state", value: end.over ? end.state : state.game.winLose.state },
        { op: "set", path: "/game/winLose/reason", value: end.over ? end.reason : state.game.winLose.reason },
        { op: "set", path: "/game/winLose/reachedAtRound", value: end.over ? state.game.round : state.game.winLose.reachedAtRound }
      );
      if (end.over) {
        patches.push(
          { op: "set", path: "/game/lastEvent", value: end.text },
          { op: "push", path: "/game/log", value: end.text }
        );
      }
      return patches;
    }

    case "CHOOSE_ACTION": {
      if (state.ui.screen !== "GAME" || state.game.over || state.game.transit.active || state.game.encounter.active || state.game.combat.active) return [];
      const choice = action.payload.choice;
      const roll = rollForRound(rng, state.game.round);
      const outcome = resolveChoice(choice, roll);
      const baseSub = substrateFromState(state);
      const nextRound = state.game.round + 1;
      const suppliesCost = 0;
      const periodicDecayBase = nextRound % 5 === 0 ? 1 : 0;
      const periodicDecay = state.game.archetypeTrait === "MORALE_DECAY_HALF" ? (nextRound % 10 === 0 ? 1 : 0) : periodicDecayBase;
      let hp = Math.max(0, Math.min(state.game.maxHp, state.game.hp + outcome.hp));
      let supplies = Math.max(0, Math.min(SUPPLIES_CAP, state.game.supplies - suppliesCost + outcome.supplies));
      let morale = Math.max(0, Math.min(MORALE_CAP, state.game.morale + outcome.morale - periodicDecay));
      const influenceGain = influenceRegenFor(state);
      const influence = clampInt((baseSub.influence || 0) + influenceGain, 0, baseSub.influenceMax || 20);
      const substrateDrift = applySubstrateDrift(baseSub, rng, nextRound + state.game.playerDistrict);
      const zeroInfluenceTicks = influence <= 0 ? clampInt((baseSub.zeroInfluenceTicks || 0) + 1, 0, 9999) : 0;
      if (supplies <= 0) {
        hp = Math.max(0, hp - 1);
        morale = Math.max(0, morale - 1);
      }
      const end = evaluateEndState({
        hp,
        supplies,
        morale,
        round: nextRound,
        playerDistrict: state.game.playerDistrict,
        keyItems: countKeyItemsFromItems(state.game.inventory.items),
        combatsWon: state.game.stats.combatsWon,
        alivePct: substrateDrift.alivePct,
        lightPct: substrateDrift.lightPct,
        toxinPct: substrateDrift.toxinPct,
        lineageControlPct: substrateDrift.lineageControlPct,
        mutationLevel: substrateDrift.mutationLevel,
        zeroInfluenceTicks,
        influenceFailTicks: influenceFailTicksForState(state)
      });
      const eventText = end.over ? end.text : `R${nextRound} ${choice}: ${outcome.text}`;
      const patches = [
        { op: "set", path: "/game/round", value: nextRound },
        { op: "set", path: "/game/hp", value: hp },
        ...syncedSuppliesPatches(supplies),
        { op: "set", path: "/game/morale", value: morale },
        { op: "set", path: "/game/substrate/influence", value: influence },
        { op: "set", path: "/game/substrate/zeroInfluenceTicks", value: zeroInfluenceTicks },
        { op: "set", path: "/game/substrate/alivePct", value: substrateDrift.alivePct },
        { op: "set", path: "/game/substrate/lightPct", value: substrateDrift.lightPct },
        { op: "set", path: "/game/substrate/toxinPct", value: substrateDrift.toxinPct },
        { op: "set", path: "/game/substrate/lineageControlPct", value: substrateDrift.lineageControlPct },
        { op: "set", path: "/game/substrate/mutationLevel", value: substrateDrift.mutationLevel },
        { op: "set", path: "/game/lastChoice", value: choice },
        { op: "set", path: "/game/lastEvent", value: eventText },
        { op: "set", path: "/game/over", value: end.over },
        { op: "set", path: "/game/winLose/state", value: end.over ? end.state : state.game.winLose.state },
        { op: "set", path: "/game/winLose/reason", value: end.over ? end.reason : state.game.winLose.reason },
        { op: "set", path: "/game/winLose/reachedAtRound", value: end.over ? nextRound : state.game.winLose.reachedAtRound },
        { op: "set", path: "/game/panelMode", value: modeFromRoll(roll) },
        { op: "set", path: "/game/panelAnim", value: state.game.panelAnim + 1 },
        { op: "push", path: "/game/log", value: eventText }
      ];
      if (choice === "SCOUT") {
        const districtId = state.game.playerDistrict;
        const containers = DISTRICT_LOOT_CONTAINERS[districtId] || [];
        if (containers.includes("vault_black")) {
          const key = containerKey(districtId, "vault_black");
          if (!state.game.lootContainers.discovered.includes(key)) {
            patches.push(
              { op: "push", path: "/game/lootContainers/discovered", value: key },
              { op: "push", path: "/game/log", value: `Scout entdeckt Hidden-Container in District ${districtId}.` }
            );
          }
        }
      }
      return patches;
    }

    case "INTERVENE": {
      if (state.ui.screen !== "GAME" || state.game.over || state.game.encounter.active || state.game.combat.active) return [];
      const kind = String(action.payload?.kind || "LIGHT_PULSE");
      const cfg = INTERVENTION_CONFIG[kind];
      if (!cfg) return [];
      const flags = resolveFeatureFlags(state);
      if (kind === "TRIGGER_RAID" && !flags.enableRaidIntervention) {
        return [
          { op: "set", path: "/game/lastEvent", value: "Intervention TRIGGER_RAID ist im aktiven Release-Profil deaktiviert." },
          { op: "push", path: "/game/log", value: "Intervention blocked by profile: TRIGGER_RAID" }
        ];
      }
      const sub = substrateFromState(state);
      const currentInfluence = Number(sub.influence || 0);
      if (currentInfluence < cfg.cost) {
        return [
          { op: "set", path: "/game/lastEvent", value: `Intervention ${kind} abgebrochen: zu wenig Einfluss.` },
          { op: "push", path: "/game/log", value: `Intervention blocked: ${kind} (need ${cfg.cost}, have ${currentInfluence})` }
        ];
      }
      const nextInfluence = clampInt(currentInfluence - cfg.cost, 0, sub.influenceMax || 20);
      const nextAlive = clampInt((sub.alivePct || 0) + cfg.alive, 0, 100);
      const nextLight = clampInt((sub.lightPct || 0) + cfg.light, 0, 100);
      const nextToxin = clampInt((sub.toxinPct || 0) + cfg.toxin, 0, 100);
      const nextLineage = clampInt((sub.lineageControlPct || 0) + cfg.lineage, 0, 100);
      const nextMutation = clampInt((sub.mutationLevel || 0) + cfg.mutation, 0, 9);
      const nextZero = nextInfluence <= 0 ? clampInt((sub.zeroInfluenceTicks || 0) + 1, 0, 9999) : 0;
      return [
        { op: "set", path: "/game/substrate/influence", value: nextInfluence },
        { op: "set", path: "/game/substrate/zeroInfluenceTicks", value: nextZero },
        { op: "set", path: "/game/substrate/alivePct", value: nextAlive },
        { op: "set", path: "/game/substrate/lightPct", value: nextLight },
        { op: "set", path: "/game/substrate/toxinPct", value: nextToxin },
        { op: "set", path: "/game/substrate/lineageControlPct", value: nextLineage },
        { op: "set", path: "/game/substrate/mutationLevel", value: nextMutation },
        { op: "set", path: "/game/substrate/lastIntervention", value: kind },
        { op: "set", path: "/game/lastEvent", value: `${cfg.text} (-${cfg.cost} Einfluss)` },
        { op: "push", path: "/game/log", value: `Intervention ${kind}: influence ${currentInfluence}->${nextInfluence}` }
      ];
    }

    case "TRAVEL_TO": {
      if (state.ui.screen !== "GAME" || state.game.over || state.game.transit.active || state.game.encounter.active || state.game.combat.active) return [];
      const from = state.game.playerDistrict;
      const to = action.payload.to;
      const fromDistrict = findDistrict(from);
      const toDistrict = findDistrict(to);
      if (!fromDistrict || !toDistrict) return [];
      if (from === to || !isRoadOpen(from, to)) return [];
      const travelText = `Route gesetzt: ${fromDistrict.name} -> ${toDistrict.name}`;
      return [
        { op: "set", path: "/game/transit/active", value: true },
        { op: "set", path: "/game/transit/from", value: from },
        { op: "set", path: "/game/transit/to", value: to },
        { op: "set", path: "/game/transit/progress", value: 0 },
        { op: "set", path: "/game/transit/cooldown", value: 2 },
        { op: "set", path: "/game/panelMode", value: "DIALOG" },
        { op: "set", path: "/game/panelAnim", value: state.game.panelAnim + 1 },
        { op: "set", path: "/game/lastEvent", value: travelText },
        { op: "push", path: "/game/log", value: travelText }
      ];
    }

    case "RESOLVE_ENCOUNTER": {
      if (!state.game.encounter.active || state.ui.screen !== "GAME" || state.game.over) return [];
      const mode = action.payload.mode;
      const optionId = action.payload.optionId || "";
      const required = state.game.encounter.required;
      if (required === "COMBAT" && mode !== "COMBAT") return [];

      if (required === "COMBAT" && mode === "COMBAT") {
        const enemy = dynamicEnemyFromState(state, rng, 1);
        return [
          { op: "set", path: "/game/encounter/active", value: false },
          { op: "set", path: "/game/encounter/text", value: "" },
          { op: "set", path: "/game/encounter/decisionId", value: "" },
          { op: "set", path: "/game/encounter/options", value: [] },
          ...beginCombatPatches(state, enemy.enemyName, enemy.hp, false, "Du gehst auf den Kontakt und ziehst die Waffe.", enemy.enemyId, enemy.enemyTier)
        ];
      }

      const selected = state.game.encounter.options.find((o) => o.id === optionId) || state.game.encounter.options.find((o) => o.mode === mode);
      if (!selected) return [];

      const hpBase = Math.max(0, Math.min(state.game.maxHp, state.game.hp + (selected.hpDelta || 0)));
      const suppliesBase = Math.max(0, Math.min(SUPPLIES_CAP, state.game.supplies + (selected.suppliesDelta || 0)));
      const moraleBase = Math.max(0, Math.min(MORALE_CAP, state.game.morale + (selected.moraleDelta || 0)));
      const resourcesBase = state.game.resources;
      const resourcesAfterDecision = {
        supplies: suppliesBase,
        ammo: clampInt((resourcesBase.ammo || 0) + (selected.ammoDelta || 0), 0, 999),
        meds: clampInt((resourcesBase.meds || 0) + (selected.medsDelta || 0), 0, 999),
        scrap: clampInt((resourcesBase.scrap || 0) + (selected.scrapDelta || 0), 0, 999),
        intel: clampInt((resourcesBase.intel || 0) + (selected.intelDelta || 0), 0, 999),
        credits: clampInt((resourcesBase.credits || 0) + (selected.creditsDelta || 0), 0, 999)
      };
      const transitProgress = clampInt((state.game.transit.progress || 0) + (selected.progressDelta || 0), 0, 100);
      const questsActive = applyQuestProgress(state.game.quests, selected.questProgressDelta || 0);
      const skillRoll = rollForIndex(rng.sim, state.game.round + state.game.playerDistrict + String(selected.id || "").length, 0, 100);
      const threshold = 65 + (state.game.morale >= 8 ? 20 : state.game.morale <= 3 ? -20 : 0);
      const decisionSuccess = selected.mode === "COMBAT" ? false : skillRoll <= threshold;
      const hp = decisionSuccess ? hpBase : Math.max(0, hpBase - 1);
      const supplies = suppliesBase;
      const morale = decisionSuccess ? moraleBase : Math.max(0, moraleBase - 1);
      const endAfterDecision = evaluateEndState({
        hp,
        supplies,
        morale,
        round: state.game.round,
        playerDistrict: state.game.playerDistrict,
        keyItems: countKeyItemsFromItems(state.game.inventory.items),
        combatsWon: state.game.stats.combatsWon,
        influenceFailTicks: influenceFailTicksForState(state)
      });

      if (selected.mode === "COMBAT") {
        if (endAfterDecision.over) {
          return [
            { op: "set", path: "/game/hp", value: hp },
            ...syncedSuppliesPatches(supplies),
            { op: "set", path: "/game/morale", value: morale },
            { op: "set", path: "/game/resources/ammo", value: resourcesAfterDecision.ammo },
            { op: "set", path: "/game/resources/meds", value: resourcesAfterDecision.meds },
            { op: "set", path: "/game/resources/scrap", value: resourcesAfterDecision.scrap },
            { op: "set", path: "/game/resources/intel", value: resourcesAfterDecision.intel },
            { op: "set", path: "/game/resources/credits", value: resourcesAfterDecision.credits },
            { op: "set", path: "/game/transit/progress", value: transitProgress },
            { op: "set", path: "/game/quests/active", value: questsActive },
            { op: "set", path: "/game/encounter/active", value: false },
            { op: "set", path: "/game/encounter/text", value: "" },
            { op: "set", path: "/game/encounter/decisionId", value: "" },
            { op: "set", path: "/game/encounter/options", value: [] },
            { op: "set", path: "/game/decisions/lastOutcome", value: "FAIL" },
            { op: "push", path: "/game/decisions/history", value: { decisionId: state.game.encounter.decisionId, optionId: selected.id, outcome: "FAIL", round: state.game.round } },
            { op: "inc", path: "/game/stats/decisionsMade", amount: 1 },
            { op: "set", path: "/game/over", value: true },
            { op: "set", path: "/game/winLose/state", value: endAfterDecision.state },
            { op: "set", path: "/game/winLose/reason", value: endAfterDecision.reason },
            { op: "set", path: "/game/winLose/reachedAtRound", value: state.game.round },
            { op: "set", path: "/game/lastEvent", value: endAfterDecision.text },
            { op: "push", path: "/game/log", value: endAfterDecision.text }
          ];
        }
        const enemy = dynamicEnemyFromState(state, rng, 2);
        return [
          { op: "set", path: "/game/hp", value: hp },
          ...syncedSuppliesPatches(supplies),
          { op: "set", path: "/game/morale", value: morale },
          { op: "set", path: "/game/resources/ammo", value: resourcesAfterDecision.ammo },
          { op: "set", path: "/game/resources/meds", value: resourcesAfterDecision.meds },
          { op: "set", path: "/game/resources/scrap", value: resourcesAfterDecision.scrap },
          { op: "set", path: "/game/resources/intel", value: resourcesAfterDecision.intel },
          { op: "set", path: "/game/resources/credits", value: resourcesAfterDecision.credits },
          { op: "set", path: "/game/transit/progress", value: transitProgress },
          { op: "set", path: "/game/quests/active", value: questsActive },
          { op: "set", path: "/game/encounter/active", value: false },
          { op: "set", path: "/game/encounter/text", value: "" },
          { op: "set", path: "/game/encounter/decisionId", value: "" },
          { op: "set", path: "/game/encounter/options", value: [] },
          { op: "set", path: "/game/decisions/lastOutcome", value: "COMBAT" },
          { op: "push", path: "/game/decisions/history", value: { decisionId: state.game.encounter.decisionId, optionId: selected.id, outcome: "COMBAT", round: state.game.round } },
          { op: "inc", path: "/game/stats/decisionsMade", amount: 1 },
          ...beginCombatPatches(state, enemy.enemyName, enemy.hp, false, `Option ${selected.label}: Begegnung eskaliert.`, enemy.enemyId, enemy.enemyTier)
        ];
      }

      const solved = decisionSuccess
        ? `Option ${selected.label}: Der Weg ist frei.`
        : `Option ${selected.label}: Teilweise gescheitert, aber der Weg bleibt offen.`;
      const patches = [
        { op: "set", path: "/game/hp", value: hp },
        ...syncedSuppliesPatches(supplies),
        { op: "set", path: "/game/morale", value: morale },
        { op: "set", path: "/game/resources/ammo", value: resourcesAfterDecision.ammo },
        { op: "set", path: "/game/resources/meds", value: resourcesAfterDecision.meds },
        { op: "set", path: "/game/resources/scrap", value: resourcesAfterDecision.scrap },
        { op: "set", path: "/game/resources/intel", value: resourcesAfterDecision.intel },
        { op: "set", path: "/game/resources/credits", value: resourcesAfterDecision.credits },
        { op: "set", path: "/game/transit/progress", value: transitProgress },
        { op: "set", path: "/game/quests/active", value: questsActive },
        { op: "set", path: "/game/over", value: endAfterDecision.over },
        { op: "set", path: "/game/winLose/state", value: endAfterDecision.over ? endAfterDecision.state : state.game.winLose.state },
        { op: "set", path: "/game/winLose/reason", value: endAfterDecision.over ? endAfterDecision.reason : state.game.winLose.reason },
        { op: "set", path: "/game/winLose/reachedAtRound", value: endAfterDecision.over ? state.game.round : state.game.winLose.reachedAtRound },
        { op: "set", path: "/game/encounter/active", value: false },
        { op: "set", path: "/game/encounter/text", value: "" },
        { op: "set", path: "/game/encounter/decisionId", value: "" },
        { op: "set", path: "/game/encounter/options", value: [] },
        { op: "set", path: "/game/decisions/lastOutcome", value: decisionSuccess ? "SUCCESS" : "FAIL" },
        { op: "push", path: "/game/decisions/history", value: { decisionId: state.game.encounter.decisionId, optionId: selected.id, outcome: decisionSuccess ? "SUCCESS" : "FAIL", round: state.game.round } },
        { op: "inc", path: "/game/stats/decisionsMade", amount: 1 },
        { op: "set", path: "/game/lastEvent", value: solved },
        { op: "set", path: "/game/panelMode", value: "DIALOG" },
        { op: "set", path: "/game/panelAnim", value: state.game.panelAnim + 1 },
        { op: "push", path: "/game/log", value: solved }
      ];
      if (endAfterDecision.over) {
        patches.push(
          { op: "set", path: "/game/lastEvent", value: endAfterDecision.text },
          { op: "push", path: "/game/log", value: endAfterDecision.text }
        );
      }
      return patches;
    }

    case "SET_GAME_OUTCOME": {
      const outcomeState = action.payload?.state || "ONGOING";
      const isOngoing = outcomeState === "ONGOING";
      const reason = isOngoing ? "" : (action.payload?.reason || "Outcome gesetzt.");
      const reachedAtRound = isOngoing ? -1 : state.game.round;
      const eventText = isOngoing ? "Spielstatus zurueck auf laufend gesetzt." : `Spielende: ${outcomeState} (${reason})`;
      return [
        { op: "set", path: "/game/winLose/state", value: outcomeState },
        { op: "set", path: "/game/winLose/reason", value: reason },
        { op: "set", path: "/game/winLose/reachedAtRound", value: reachedAtRound },
        { op: "set", path: "/game/over", value: !isOngoing },
        { op: "set", path: "/game/lastEvent", value: eventText },
        { op: "push", path: "/game/log", value: eventText }
      ];
    }

    case "TRACK_STAT": {
      const key = action.payload?.statKey;
      const amount = action.payload?.amount ?? 1;
      if (!key || amount === 0) return [];
      return [{ op: "inc", path: `/game/stats/${key}`, amount }];
    }

    case "SIM_STEP":
      return [];

    default:
      return [];
  }
}

function runProjectSimStepEngine(nextState, rng) {
  if (nextState.ui.screen !== "GAME" || nextState.game.over) return [];
  const featureFlags = resolveFeatureFlags(nextState);
  const sub = substrateFromState(nextState);
  const drift = applySubstrateDrift(sub, rng, nextState.game.round + nextState.game.transit.progress + nextState.game.combat.tick);
  const regen = influenceRegenFor(nextState);
  const influence = clampInt((sub.influence || 0) + regen, 0, sub.influenceMax || 20);
  const zeroInfluenceTicks = influence <= 0 ? clampInt((sub.zeroInfluenceTicks || 0) + 1, 0, 9999) : 0;
  const substrateTickPatches = [
    { op: "set", path: "/game/substrate/influence", value: influence },
    { op: "set", path: "/game/substrate/zeroInfluenceTicks", value: zeroInfluenceTicks },
    { op: "set", path: "/game/substrate/alivePct", value: drift.alivePct },
    { op: "set", path: "/game/substrate/lightPct", value: drift.lightPct },
    { op: "set", path: "/game/substrate/toxinPct", value: drift.toxinPct },
    { op: "set", path: "/game/substrate/lineageControlPct", value: drift.lineageControlPct },
    { op: "set", path: "/game/substrate/mutationLevel", value: drift.mutationLevel }
  ];
  const substrateEnd = evaluateEndState({
    hp: nextState.game.hp,
    supplies: nextState.game.supplies,
    morale: nextState.game.morale,
    round: nextState.game.round,
    playerDistrict: nextState.game.playerDistrict,
    keyItems: countKeyItemsFromItems(nextState.game.inventory.items),
    combatsWon: nextState.game.stats.combatsWon,
    alivePct: drift.alivePct,
    lightPct: drift.lightPct,
    toxinPct: drift.toxinPct,
    lineageControlPct: drift.lineageControlPct,
    mutationLevel: drift.mutationLevel,
    zeroInfluenceTicks,
    influenceFailTicks: influenceFailTicksForState(nextState)
  });
  if (substrateEnd.over) {
    return [
      ...substrateTickPatches,
      { op: "set", path: "/game/over", value: true },
      { op: "set", path: "/game/winLose/state", value: substrateEnd.state },
      { op: "set", path: "/game/winLose/reason", value: substrateEnd.reason },
      { op: "set", path: "/game/winLose/reachedAtRound", value: nextState.game.round },
      { op: "set", path: "/game/lastEvent", value: substrateEnd.text },
      { op: "push", path: "/game/log", value: substrateEnd.text }
    ];
  }
  const withSubTick = (patches) => [...substrateTickPatches, ...patches];

  if (nextState.game.encounter.active) {
    const nextAge = clampInt((nextState.game.encounter.ageTicks || 0) + 1, 0, 9999);
    const timeout = clampInt(nextState.game.encounter.timeoutTicks || 6, 1, 99);
    const basePatches = [{ op: "set", path: "/game/encounter/ageTicks", value: nextAge }];
    if (!featureFlags.autoResolveEncounterTimeout || nextAge < timeout) return withSubTick(basePatches);

    if (nextState.game.encounter.required === "COMBAT") {
      const enemy = dynamicEnemyFromState(nextState, rng, 1);
      return withSubTick([
        ...basePatches,
        { op: "set", path: "/game/encounter/active", value: false },
        { op: "set", path: "/game/encounter/text", value: "" },
        { op: "set", path: "/game/encounter/decisionId", value: "" },
        { op: "set", path: "/game/encounter/options", value: [] },
        ...beginCombatPatches(nextState, enemy.enemyName, enemy.hp, false, "Timeout: Kontakt eskaliert automatisch in Kampf.", enemy.enemyId, enemy.enemyTier)
      ]);
    }

    return withSubTick([
      ...basePatches,
      { op: "set", path: "/game/encounter/active", value: false },
      { op: "set", path: "/game/encounter/text", value: "" },
      { op: "set", path: "/game/encounter/decisionId", value: "" },
      { op: "set", path: "/game/encounter/options", value: [] },
      { op: "set", path: "/game/lastEvent", value: "Encounter-Timeout: Auto-Resolve (Abwarten)." },
      { op: "set", path: "/game/panelMode", value: "DIALOG" },
      { op: "set", path: "/game/panelAnim", value: nextState.game.panelAnim + 1 },
      { op: "push", path: "/game/log", value: "Encounter timeout auto-resolved." }
    ]);
  }

  if (nextState.game.combat.active && nextState.game.combat.phase === "ACTIVE") {
    const tick = nextState.game.combat.tick;
    const stance = nextState.game.combat.stance || "BALANCED";
    const armor = nextState.game.combat.selectedItemKind === "GEAR" ? 1 + Math.floor(nextState.game.combat.selectedItemPower / 2) : 0;
    const dmgBonus = nextState.game.combat.selectedItemKind === "WEAPON" ? nextState.game.combat.selectedItemPower : 0;
    const stancePlayerBonus = stance === "AGGRESSIVE" ? 1 : stance === "DEFENSIVE" ? -1 : 0;
    const stanceEnemyBonus = stance === "AGGRESSIVE" ? 1 : stance === "DEFENSIVE" ? -1 : 0;
    const enemyPressureBase = Math.max(1, Math.floor(nextState.game.combat.enemyMaxHp / 7));
    let enemyPressure = nextState.game.combat.enemyId === "RAIDER" ? enemyPressureBase + 1 : enemyPressureBase;
    if (nextState.game.combat.enemyId === "BOSS" && nextState.game.combat.enemyHp <= Math.floor(nextState.game.combat.enemyMaxHp / 2)) {
      enemyPressure += 1;
    }
    const enemyHitRoll = rollForIndex(rng.sim, nextState.game.round + tick + nextState.game.combat.enemyMaxHp, 0, 3);
    const playerHitRoll = rollForIndex(rng.world, nextState.game.round + tick + nextState.game.hp, 0, 4);
    const critRoll = rollForIndex(rng.cos, nextState.game.round + tick + nextState.game.combat.enemyMaxHp + 31, 0, 100);
    const hunterCrit = nextState.game.combat.enemyId === "HUNTER" && critRoll < 15 ? 1 : 0;
    const bossBurst = nextState.game.combat.enemyId === "BOSS" && tick % 3 === 2 ? 2 : 0;
    let enemyHit = Math.max(0, enemyPressure + enemyHitRoll + stanceEnemyBonus - armor - 1 + hunterCrit + bossBurst);
    const emergencyPenalty = !!nextState.game.combat.emergencyPenalty;
    if (emergencyPenalty) {
      const secondRoll = rollForIndex(rng.sim, nextState.game.round + tick + nextState.game.combat.enemyMaxHp + 97, 0, 3);
      const extraHit = Math.max(0, enemyPressure + secondRoll + stanceEnemyBonus - armor - 1);
      enemyHit += extraHit;
    }
    const playerHit = Math.max(1, 1 + dmgBonus + stancePlayerBonus + moraleDamageBonus(nextState.game.morale) + playerHitRoll - Math.floor(enemyPressure / 2));

    let hpBase = nextState.game.hp;
    const patches = [];

    if (hpBase <= 5) {
      const med = normalizeInventoryItems(nextState.game.inventory.items).find((it) => it.kind === "CONSUMABLE" && String(it.effect).includes("Heilt"));
      if (med) {
        hpBase = Math.min(nextState.game.maxHp, hpBase + med.power);
        patches.push(
          { op: "set", path: "/game/hp", value: hpBase },
          { op: "set", path: "/game/inventory/items", value: removeFirstItemBySelection(nextState.game.inventory.items, med) },
          { op: "set", path: "/game/lastEvent", value: "Notfall: Du setzt ein Heilmittel im Gefecht ein." },
          { op: "push", path: "/game/log", value: "Notfallverbrauch: Heil-Consumable." }
        );
      }
    }

    const hp = Math.max(0, hpBase - enemyHit);
    let enemyHp = Math.max(0, nextState.game.combat.enemyHp - playerHit);
    if (nextState.game.combat.enemyId === "MUTANT" && enemyHp > 0 && (tick % 3 === 2)) {
      enemyHp = Math.min(nextState.game.combat.enemyMaxHp, enemyHp + 1);
    }

    if (nextState.game.combat.enemyId === "SCAVENGER" && enemyHp > 0 && enemyHp <= Math.floor(nextState.game.combat.enemyMaxHp / 2)) {
      const fleeRoll = rollForIndex(rng.cos, nextState.game.round + tick + enemyHp + 11, 0, 100);
      if (fleeRoll < 50) {
        return withSubTick([
          { op: "set", path: "/game/combat/enemyHp", value: enemyHp },
          { op: "set", path: "/game/combat/phase", value: "RESOLVED" },
          { op: "set", path: "/game/combat/active", value: false },
          { op: "set", path: "/game/combat/lastOutcome", value: "FLEE" },
          { op: "set", path: "/game/lastEvent", value: "Der Gegner flieht in die Ruinen. Kein Loot." },
          { op: "push", path: "/game/log", value: "Enemy Flee: Kontakt verloren." }
        ]);
      }
    }
    const linesAfterPlayer = appendCombatLine(nextState.game.combat.logLines, `Du triffst fuer ${playerHit}.`);
    const linesAfterBoth = appendCombatLine(linesAfterPlayer, `${nextState.game.combat.enemyName || "Gegner"} trifft fuer ${enemyHit}.`);
    const linesFinal = emergencyPenalty
      ? appendCombatLine(linesAfterBoth, "Notfallfenster: Gegner trifft doppelt.")
      : linesAfterBoth;
    patches.push(
      { op: "set", path: "/game/hp", value: hp },
      { op: "set", path: "/game/combat/enemyHp", value: enemyHp },
      { op: "set", path: "/game/combat/tick", value: nextState.game.combat.tick + 1 },
      { op: "set", path: "/game/combat/logLines", value: linesFinal }
    );
    if (emergencyPenalty) {
      patches.push({ op: "set", path: "/game/combat/emergencyPenalty", value: false });
    }

    if (enemyHp <= 0 && hp <= 0) {
      patches.push(
        { op: "set", path: "/game/over", value: true },
        { op: "set", path: "/game/combat/active", value: false },
        { op: "set", path: "/game/combat/phase", value: "RESOLVED" },
        { op: "set", path: "/game/combat/lastOutcome", value: "LOSE" },
        { op: "inc", path: "/game/stats/combatsLost", amount: 1 },
        { op: "set", path: "/game/winLose/state", value: "LOSE" },
        { op: "set", path: "/game/winLose/reason", value: "HP_ZERO" },
        { op: "set", path: "/game/winLose/reachedAtRound", value: nextState.game.round },
        { op: "set", path: "/game/lastEvent", value: "Beide brechen im selben Tick zusammen. Niederlage." },
        { op: "push", path: "/game/log", value: "Double KO: Kampf verloren." }
      );
    } else if (enemyHp <= 0) {
      patches.push(
        { op: "set", path: "/game/combat/phase", value: "RESOLVED" },
        { op: "set", path: "/game/combat/active", value: false },
        { op: "set", path: "/game/combat/lastOutcome", value: "WIN" },
        { op: "inc", path: "/game/stats/combatsWon", amount: 1 },
        { op: "set", path: "/game/flags/firstCombatDone", value: true },
        { op: "set", path: "/game/panelMode", value: "KAMPF" },
        { op: "set", path: "/game/panelAnim", value: nextState.game.panelAnim + 1 }
      );
      const lootItemIds = maybeCombatLootItemIds(nextState, rng);
      if (lootItemIds.length === 0) {
        patches.push(
          { op: "set", path: "/game/lastEvent", value: `Sieg gegen ${nextState.game.combat.enemyName}.` },
          { op: "push", path: "/game/log", value: "Kampf gewonnen." }
        );
      } else {
        const lootNames = lootItemIds.map((id) => itemById(id)?.name).filter(Boolean).join(", ");
        patches.push(
          { op: "set", path: "/game/combat/pendingLootItemIds", value: lootItemIds },
          { op: "set", path: "/game/lastEvent", value: `Sieg gegen ${nextState.game.combat.enemyName}. Loot bereit: ${lootNames}.` },
          { op: "push", path: "/game/log", value: `Kampf gewonnen. Beute bereit: ${lootNames}` }
        );
      }
      const end = evaluateEndState({
        hp,
        supplies: nextState.game.supplies,
        morale: nextState.game.morale,
        round: nextState.game.round,
        playerDistrict: nextState.game.playerDistrict,
        keyItems: countKeyItemsFromItems(nextState.game.inventory.items),
        combatsWon: nextState.game.stats.combatsWon + 1,
        influenceFailTicks: influenceFailTicksForState(nextState)
      });
      if (end.over) {
        patches.push(
          { op: "set", path: "/game/over", value: true },
          { op: "set", path: "/game/winLose/state", value: end.state },
          { op: "set", path: "/game/winLose/reason", value: end.reason },
          { op: "set", path: "/game/winLose/reachedAtRound", value: nextState.game.round },
          { op: "set", path: "/game/lastEvent", value: end.text },
          { op: "push", path: "/game/log", value: end.text }
        );
      }
    } else if (hp <= 0) {
      patches.push(
        { op: "set", path: "/game/over", value: true },
        { op: "set", path: "/game/combat/active", value: false },
        { op: "set", path: "/game/combat/phase", value: "RESOLVED" },
        { op: "set", path: "/game/combat/lastOutcome", value: "LOSE" },
        { op: "inc", path: "/game/stats/combatsLost", amount: 1 },
        { op: "set", path: "/game/winLose/state", value: "LOSE" },
        { op: "set", path: "/game/winLose/reason", value: "HP_ZERO" },
        { op: "set", path: "/game/winLose/reachedAtRound", value: nextState.game.round },
        { op: "set", path: "/game/lastEvent", value: "Du bist im Kampf gefallen." },
        { op: "push", path: "/game/log", value: "Kampf verloren." }
      );
    }
    return withSubTick(patches);
  }

  if (!nextState.game.transit.active || nextState.game.combat.active) return withSubTick([]);

  const patches = [];
  let cooldown = nextState.game.transit.cooldown;
  if (cooldown > 0) {
    cooldown -= 1;
    patches.push({ op: "set", path: "/game/transit/cooldown", value: cooldown });
  }

  const encounterRoll = rollForIndex(rng.sim, nextState.game.round + nextState.game.transit.progress + nextState.game.transit.to, 0, 100);
  const transitSignal = substrateTransitSignal(nextState);
  const districtRisk = Math.max(0, nextState.game.playerDistrict);
  const baseEncounterChance = 14 + Math.min(14, districtRisk * 2) + Math.min(8, Math.floor(nextState.game.round / 4));
  const encounterChance = clampInt(baseEncounterChance + transitSignal.encounterBonus, 6, 48);
    if (cooldown <= 0 && encounterRoll < encounterChance && nextState.game.transit.progress >= 20) {
      const encounterId = pickSubstrateEncounterId(nextState, rng, encounterRoll + transitSignal.threat);
      const dynamicEncounter = encounterById(encounterId);
      const combatThreshold = clampInt(50 + transitSignal.combatBias, 30, 85);
      const forcedCombat = dynamicEncounter.required === "COMBAT" || encounterRoll <= combatThreshold;
      if (!forcedCombat) {
        const scenario = dynamicEncounter.required === "DECISION"
          ? { id: dynamicEncounter.id, text: dynamicEncounter.text, options: dynamicEncounter.options }
          : pickDecisionScenario(nextState, rng);
        patches.push(
          { op: "set", path: "/game/encounter/active", value: true },
          { op: "set", path: "/game/encounter/required", value: "DECISION" },
          { op: "set", path: "/game/encounter/text", value: scenario.text },
          { op: "set", path: "/game/encounter/decisionId", value: scenario.id },
          { op: "set", path: "/game/encounter/options", value: scenario.options },
          { op: "set", path: "/game/lastEvent", value: scenario.text },
          { op: "set", path: "/game/panelMode", value: "DIALOG" },
          { op: "set", path: "/game/panelAnim", value: nextState.game.panelAnim + 1 },
          { op: "push", path: "/game/log", value: scenario.text },
          { op: "set", path: "/game/transit/cooldown", value: 5 }
        );
        return withSubTick(patches);
    }
    const enemy = dynamicEnemyFromState(nextState, rng, 0);
    return withSubTick([
      ...beginCombatPatches(nextState, enemy.enemyName, enemy.hp, false, dynamicEncounter.text, enemy.enemyId, enemy.enemyTier),
      { op: "set", path: "/game/transit/cooldown", value: 5 }
    ]);
  }

  const speed = rollForIndex(rng.cos, nextState.game.round + nextState.game.transit.progress + nextState.game.transit.from, 10, 16);
  const nextProgress = Math.min(100, nextState.game.transit.progress + speed);
  patches.push({ op: "set", path: "/game/transit/progress", value: nextProgress });

  if (nextProgress >= 100) {
    const to = nextState.game.transit.to;
    const district = findDistrict(to);
    const arriveText = district ? `Ankunft in ${district.name}.` : "Ankunft am Ziel.";
    patches.push(
      { op: "set", path: "/game/playerDistrict", value: to },
      { op: "set", path: "/game/transit/active", value: false },
      { op: "set", path: "/game/lastEvent", value: arriveText },
      { op: "push", path: "/game/log", value: arriveText }
    );

    const lootP = lootDistrictPatches(nextState, to);
    patches.push(...lootP);
    const lootItemId = districtLootItemId(to);
    if (lootItemId === 1 && !nextState.game.flags.firstWeaponFound) {
      patches.push(
        { op: "set", path: "/game/flags/firstWeaponFound", value: true },
        { op: "set", path: "/game/lastEvent", value: "Du hebst die Rostklinge auf. Ein Schatten beobachtet dich aus der Distanz." },
        { op: "push", path: "/game/log", value: "Erstwaffe gefunden. Kampf ist nun jederzeit moeglich." }
      );
    }
    const end = evaluateEndState({
      hp: nextState.game.hp,
      supplies: nextState.game.supplies,
      morale: nextState.game.morale,
      round: nextState.game.round,
      playerDistrict: to,
      keyItems: countKeyItemsFromItems(nextState.game.inventory.items) + ((!nextState.game.inventory.lootedDistricts.includes(to) && KEY_ITEM_IDS.includes(lootItemId || -1)) ? 1 : 0),
      combatsWon: nextState.game.stats.combatsWon,
      influenceFailTicks: influenceFailTicksForState(nextState)
    });
    if (end.over) {
      patches.push(
        { op: "set", path: "/game/over", value: true },
        { op: "set", path: "/game/winLose/state", value: end.state },
        { op: "set", path: "/game/winLose/reason", value: end.reason },
        { op: "set", path: "/game/winLose/reachedAtRound", value: nextState.game.round },
        { op: "set", path: "/game/lastEvent", value: end.text },
        { op: "push", path: "/game/log", value: end.text }
      );
    }
  }
  return withSubTick(patches);
}

export function simStep(nextState, { rng }) {
  // Dedicated pure simulation engine entrypoint. No UI side effects.
  return runProjectSimStepEngine(nextState, rng);
}
