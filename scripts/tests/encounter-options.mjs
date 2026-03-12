import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";
import { DECISION_CATALOG } from "../../src/project/decisions.module.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function initialDoc(seed) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed } }
  };
}

function makeStore(seed) {
  return createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(initialDoc(seed)) }
  );
}

function bootToGame(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

function assertOptions2to4(options, tag) {
  assert(Array.isArray(options), `${tag}: options must be array`);
  assert(options.length >= 2, `${tag}: options must have at least 2 entries`);
  assert(options.length <= 4, `${tag}: options must have at most 4 entries`);
  const ids = new Set();
  for (const [idx, option] of options.entries()) {
    assert(option && typeof option === "object", `${tag}: option ${idx} must be object`);
    assert(typeof option.id === "string" && option.id.length > 0, `${tag}: option ${idx} must have id`);
    assert(!ids.has(option.id), `${tag}: duplicate option id ${option.id}`);
    ids.add(option.id);
  }
}

for (const cat of DECISION_CATALOG) {
  const options = Array.isArray(cat.options) ? cat.options : [];
  assertOptions2to4(options, `DECISION_CATALOG/${cat.id}`);
}

const store = makeStore("encounter-option-contract");
bootToGame(store);

// Build a deterministic transit state that must produce a DECISION encounter in simStep.
// Conditions:
// - encounterRoll < encounterChance (trigger)
// - encounterRoll > combatThreshold (not forced combat)
// - dynamic encounter options are generated and must satisfy 2..4 rule.
const base = store.getState();
const probeState = {
  ...base,
  ui: { ...base.ui, screen: "GAME" },
  game: {
    ...base.game,
    over: false,
    round: 24,
    playerDistrict: 6,
    transit: {
      ...base.game.transit,
      active: true,
      from: 6,
      to: 1,
      progress: 20,
      cooldown: 0
    },
    combat: {
      ...base.game.combat,
      active: false,
      phase: "NONE"
    },
    encounter: {
      ...base.game.encounter,
      active: false,
      required: "DECISION",
      options: []
    },
    substrate: {
      ...base.game.substrate,
      alivePct: 100,
      lightPct: 100,
      toxinPct: 0,
      mutationLevel: 0,
      lineageControlPct: 0
    }
  }
};

function fixedStream(value) {
  return {
    int(min, max) {
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return min;
      const clamped = Math.max(min, Math.min(max - 1, value));
      return clamped;
    }
  };
}

const patches = simStep(probeState, {
  rng: {
    // encounterRoll path uses sim stream; 31 ensures trigger (<33 chance) and no forced combat (>30 threshold)
    sim: fixedStream(31),
    world: fixedStream(2),
    cos: fixedStream(1)
  }
});

const optionsPatch = patches.find((p) => p.op === "set" && p.path === "/game/encounter/options");
const requiredPatch = patches.find((p) => p.op === "set" && p.path === "/game/encounter/required");
assert(requiredPatch && requiredPatch.value === "DECISION", "simStep should create DECISION encounter for probe state");
assert(optionsPatch, "simStep should set encounter options for DECISION encounter");
assertOptions2to4(optionsPatch.value, "simStep/generated-options");

console.log("ENCOUNTER_OPTIONS_MIN_OK");
