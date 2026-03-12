function asObj(v) {
  return v && typeof v === "object" ? v : {};
}

function mapLoadoutPayload(payload) {
  const p = asObj(payload);
  const loadout = p.loadout || p.archetype || p.id || "SURVIVOR";
  return { loadout: String(loadout) };
}

function mapTravelPayload(payload) {
  const p = asObj(payload);
  const to = Number(p.to ?? p.districtId ?? p.targetDistrict ?? 0);
  return { to };
}

function mapResolvePayload(payload) {
  const p = asObj(payload);
  const mode = String(p.mode || p.required || "DECISION").toUpperCase() === "COMBAT" ? "COMBAT" : "DECISION";
  const optionId = String(p.optionId || p.choiceId || p.id || "");
  return { mode, optionId };
}

function mapInterventionPayload(payload, fallback = "LIGHT_PULSE") {
  const p = asObj(payload);
  const kind = p.kind || p.intervention || p.id || fallback;
  return { kind: String(kind) };
}

function mapItemPayload(payload) {
  const p = asObj(payload);
  const itemId = Number(p.itemId ?? p.id ?? -1);
  return { itemId };
}

const LEGACY_ACTION_MAP = {
  START_RUN: { type: "START_GAME" },
  ACCEPT_POLICY: { type: "ACCEPT_RULES" },
  ACCEPT_TERMS: { type: "ACCEPT_RULES" },
  ADVANCE_DIALOG: { type: "NEXT_DIALOG" },
  PICK_LOADOUT: { type: "CHOOSE_LOADOUT", mapPayload: mapLoadoutPayload },
  SELECT_ARCHETYPE: { type: "CHOOSE_LOADOUT", mapPayload: mapLoadoutPayload },
  MOVE_TO_DISTRICT: { type: "TRAVEL_TO", mapPayload: mapTravelPayload },
  TRAVEL_ROUTE: { type: "TRAVEL_TO", mapPayload: mapTravelPayload },
  RESOLVE_DECISION: { type: "RESOLVE_ENCOUNTER", mapPayload: mapResolvePayload },
  APPLY_LIGHT_PULSE: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "LIGHT_PULSE") },
  APPLY_NUTRIENT_INJECTION: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "NUTRIENT_INJECTION") },
  APPLY_TOXIN_ABSORB: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "TOXIN_ABSORB") },
  APPLY_STRENGTHEN_LINEAGE: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "STRENGTHEN_LINEAGE") },
  APPLY_TRIGGER_RAID: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "TRIGGER_RAID") },
  APPLY_BUILD_BRIDGE: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "BUILD_BRIDGE") },
  APPLY_QUARANTINE_ZONE: { type: "INTERVENE", mapPayload: (p) => mapInterventionPayload(p, "QUARANTINE_ZONE") },
  STEP_SIMULATION: { type: "SIM_STEP" },
  TICK_SIMULATION: { type: "SIM_STEP" },
  OPEN_ITEM: { type: "OPEN_ITEM_DETAIL", mapPayload: mapItemPayload },
  CLOSE_ITEM: { type: "CLOSE_ITEM_DETAIL" }
};

export function adaptLegacyAction(action) {
  const raw = asObj(action);
  const rawType = String(raw.type || "");
  if (!rawType) return action;
  const rule = LEGACY_ACTION_MAP[rawType];
  if (!rule) return action;
  const payload = typeof rule.mapPayload === "function" ? rule.mapPayload(raw.payload) : asObj(raw.payload);
  return { type: rule.type, payload };
}
