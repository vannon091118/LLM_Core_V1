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

function makeInitialDoc(seed) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed } }
  };
}

function runStabilityScenario(seed) {
  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(makeInitialDoc(seed)) }
  );

  let dispatchCount = 0;
  let eventCount = 0;
  store.subscribe(() => { eventCount += 1; });

  function dispatch(action) {
    store.dispatch(action);
    dispatchCount += 1;
  }

  dispatch({ type: "START_GAME", payload: {} });
  dispatch({ type: "ACCEPT_RULES", payload: {} });
  dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  dispatch({ type: "NEXT_DIALOG", payload: {} });
  dispatch({ type: "NEXT_DIALOG", payload: {} });
  dispatch({ type: "NEXT_DIALOG", payload: {} });

  const choices = ["SCOUT", "FORAGE", "REST"];
  for (let i = 0; i < 500; i++) {
    const st = store.getState();
    if (!st.game.over) {
      dispatch({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
    }
    if (st.ui.screen === "GAME" && !st.game.transit.active && !st.game.over) {
      dispatch({ type: "TRAVEL_TO", payload: { to: (st.game.playerDistrict + 1 + (i % 2)) % 7 } });
    }

    const now = store.getState();
    if (now.game.encounter.active) {
      const selected = now.game.encounter.options[0];
      dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: {
          mode: selected?.mode || now.game.encounter.required || "DECISION",
          optionId: selected?.id || ""
        }
      });
    }

    const combat = store.getState().game.combat;
    if (combat.active && combat.phase === "PREP") {
      dispatch({ type: "BEGIN_COMBAT", payload: {} });
    }

    dispatch({ type: "SIM_STEP", payload: {} });

    if (store.getState().game.combat.phase === "RESOLVED") {
      dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    }
  }

  const doc = store.getDoc();
  const final = store.getState();
  assert(doc.revisionCount === dispatchCount, `revision mismatch: ${doc.revisionCount} != ${dispatchCount}`);
  assert(eventCount === dispatchCount, `listener mismatch: ${eventCount} != ${dispatchCount}`);
  assert(Number.isFinite(final.game.round), "round should remain finite");

  const snapshot = stableStringify({
    ui: final.ui,
    game: {
      round: final.game.round,
      hp: final.game.hp,
      supplies: final.game.supplies,
      morale: final.game.morale,
      transit: final.game.transit,
      encounter: final.game.encounter,
      combat: final.game.combat,
      winLose: final.game.winLose,
      stats: final.game.stats,
      substrate: final.game.substrate
    }
  });

  return {
    signature: store.getSignature(),
    snapshot,
    dispatchCount,
    eventCount,
    revisionCount: doc.revisionCount
  };
}

const a = runStabilityScenario("stability-seed-a");
const b = runStabilityScenario("stability-seed-a");
const c = runStabilityScenario("stability-seed-b");

assert(a.signature === b.signature, "same seed should keep stable signature");
assert(a.snapshot === b.snapshot, "same seed should keep stable snapshot");
assert(a.dispatchCount === b.dispatchCount, "same seed should keep identical dispatch count");
assert(a.eventCount === b.eventCount, "same seed should keep identical event count");
assert(a.revisionCount === b.revisionCount, "same seed should keep identical revision count");
assert(a.signature !== c.signature || a.snapshot !== c.snapshot, "different seed should diverge under stability scenario");

console.log("STABILITY_OK");
