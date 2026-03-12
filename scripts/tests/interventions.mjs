import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { reducer, simStep } from "../../src/project/project.logic.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memoryDriver() {
  let doc = null;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function toGameScreen(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

const store = createStore(
  manifest,
  { reducer, simStep },
  { storageDriver: memoryDriver(), actionAdapter: adaptLegacyAction }
);

toGameScreen(store);
assert(store.getState().ui.screen === "GAME", "must be in GAME before interventions");

const before = store.getState();
const beforeInfluence = before.game.substrate.influence;
store.dispatch({ type: "INTERVENE", payload: { kind: "LIGHT_PULSE" } });
const afterPulse = store.getState();
assert(afterPulse.game.substrate.influence === beforeInfluence - 1, "LIGHT_PULSE should cost 1 influence");
assert(afterPulse.game.substrate.lastIntervention === "LIGHT_PULSE", "lastIntervention should be LIGHT_PULSE");

// Spend influence down to zero.
for (let i = 0; i < 30; i++) {
  if (store.getState().game.substrate.influence <= 0) break;
  store.dispatch({ type: "INTERVENE", payload: { kind: "LIGHT_PULSE" } });
}
const atZero = store.getState();
assert(atZero.game.substrate.influence === 0, "influence should reach zero after repeated interventions");

// Insufficient influence must not apply intervention deltas.
const toxinBeforeBlocked = atZero.game.substrate.toxinPct;
store.dispatch({ type: "INTERVENE", payload: { kind: "QUARANTINE_ZONE" } });
const blocked = store.getState();
assert(blocked.game.substrate.influence === 0, "blocked intervention must keep influence at zero");
assert(blocked.game.substrate.toxinPct === toxinBeforeBlocked, "blocked intervention must not alter substrate");

// SIM_STEP regenerates influence based on lineage control.
store.dispatch({ type: "SIM_STEP", payload: {} });
const afterStep = store.getState();
assert(afterStep.game.substrate.influence >= 1, "SIM_STEP should regenerate influence from zero");
assert(Number.isFinite(afterStep.game.substrate.alivePct), "SIM_STEP should update alivePct");
assert(Number.isFinite(afterStep.game.substrate.lightPct), "SIM_STEP should update lightPct");
assert(Number.isFinite(afterStep.game.substrate.toxinPct), "SIM_STEP should update toxinPct");

console.log("INTERVENTIONS_OK");
