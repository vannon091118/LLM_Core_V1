import { stableStringify } from "../../src/kernel/stableStringify.js";
import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

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

function buildInitialDoc(seed) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed } }
  };
}

function runFlow(seed) {
  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(buildInitialDoc(seed)) }
  );

  const dispatches = [
    { type: "START_GAME", payload: {} },
    { type: "ACCEPT_RULES", payload: {} },
    { type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } },
    { type: "NEXT_DIALOG", payload: {} },
    { type: "NEXT_DIALOG", payload: {} },
    { type: "NEXT_DIALOG", payload: {} }
  ];
  for (const action of dispatches) store.dispatch(action);

  const choices = ["SCOUT", "FORAGE", "REST"];
  const interventions = ["LIGHT_PULSE", "NUTRIENT_INJECTION", "TOXIN_ABSORB", "STRENGTHEN_LINEAGE"];
  for (let i = 0; i < 120; i++) {
    const state = store.getState();
    if (!state.game.over) {
      store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
    }
    if (state.ui.screen === "GAME" && !state.game.transit.active && !state.game.over) {
      store.dispatch({ type: "TRAVEL_TO", payload: { to: (state.game.playerDistrict + 1 + (i % 3)) % 7 } });
    }
    if (i % 7 === 0 && !store.getState().game.over) {
      store.dispatch({ type: "INTERVENE", payload: { kind: interventions[i % interventions.length] } });
    }
    if (store.getState().game.encounter.active) {
      const encounter = store.getState().game.encounter;
      const opt = encounter.options[0];
      store.dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: { mode: opt?.mode || encounter.required || "DECISION", optionId: opt?.id || "" }
      });
    }
    if (store.getState().game.combat.active && store.getState().game.combat.phase === "PREP") {
      store.dispatch({ type: "CHANGE_STANCE", payload: { stance: "BALANCED" } });
      store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
    }
    store.dispatch({ type: "SIM_STEP", payload: {} });
  }

  const finalState = store.getState();
  const snapshot = stableStringify({
    round: finalState.game.round,
    hp: finalState.game.hp,
    supplies: finalState.game.supplies,
    morale: finalState.game.morale,
    lastEvent: finalState.game.lastEvent,
    substrate: finalState.game.substrate,
    winLose: finalState.game.winLose,
    stats: finalState.game.stats
  });

  return { signature: store.getSignature(), snapshot };
}

const a = runFlow("seed-drift-a");
const b = runFlow("seed-drift-a");
const c = runFlow("seed-drift-b");

assert(a.signature === b.signature, "same seed should produce same signature");
assert(a.snapshot === b.snapshot, "same seed should produce same snapshot");
assert(a.signature !== c.signature || a.snapshot !== c.snapshot, "different seeds should diverge");

console.log("DRIFT_SIGNATURE_OK");
