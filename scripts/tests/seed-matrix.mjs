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
    load: () => doc,
    save: (next) => { doc = next; }
  };
}

function makeInitialDoc(seed, profile) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      meta: { seed },
      app: { releaseProfile: profile }
    }
  };
}

function runScenario(seed, profile) {
  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(makeInitialDoc(seed, profile)) }
  );

  let eventCount = 0;
  let dispatchCount = 0;
  store.subscribe(() => { eventCount += 1; });

  const dispatch = (action) => {
    store.dispatch(action);
    dispatchCount += 1;
  };

  dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile } });
  dispatch({ type: "START_GAME", payload: {} });
  dispatch({ type: "ACCEPT_RULES", payload: {} });
  dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  dispatch({ type: "NEXT_DIALOG", payload: {} });
  dispatch({ type: "NEXT_DIALOG", payload: {} });
  dispatch({ type: "NEXT_DIALOG", payload: {} });

  const choices = ["SCOUT", "FORAGE", "REST"];
  for (let i = 0; i < 220; i++) {
    const st = store.getState();
    if (!st.game.over && st.ui.screen === "GAME" && !st.game.transit.active) {
      dispatch({ type: "TRAVEL_TO", payload: { to: (st.game.playerDistrict + 1 + (i % 2)) % 7 } });
    }

    if (!store.getState().game.over) {
      dispatch({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
    }

    const enc = store.getState().game.encounter;
    if (enc.active) {
      const opt = enc.options[0];
      dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: { mode: opt?.mode || enc.required || "DECISION", optionId: opt?.id || "" }
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
  return {
    signature: store.getSignature(),
    snapshot: stableStringify(store.getState()),
    revisionCount: doc.revisionCount,
    eventCount,
    dispatchCount
  };
}

const profiles = ["alpha", "beta", "rc"];
const seeds = ["sA", "sB", "sC"];

for (const profile of profiles) {
  for (const seed of seeds) {
    const baseSeed = `seed-matrix:${profile}:${seed}`;
    const a = runScenario(baseSeed, profile);
    const b = runScenario(baseSeed, profile);

    assert(a.signature === b.signature, `${profile}/${seed}: signature mismatch`);
    assert(a.snapshot === b.snapshot, `${profile}/${seed}: snapshot mismatch`);
    assert(a.revisionCount === b.revisionCount, `${profile}/${seed}: revisionCount mismatch`);
    assert(a.eventCount === b.eventCount, `${profile}/${seed}: eventCount mismatch`);
    assert(a.dispatchCount === b.dispatchCount, `${profile}/${seed}: dispatchCount mismatch`);

    const diverged = runScenario(`${baseSeed}:other`, profile);
    assert(
      diverged.signature !== a.signature || diverged.snapshot !== a.snapshot,
      `${profile}/${seed}: changed seed should diverge`
    );
  }
}

console.log("SEED_MATRIX_OK");
