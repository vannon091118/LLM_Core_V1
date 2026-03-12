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

function bootToGame(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

function runScenario({ seed, profile }) {
  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(makeInitialDoc(seed)) }
  );

  store.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile } });
  bootToGame(store);

  const actions = ["SCOUT", "FORAGE", "REST"];
  const stances = ["AGGRESSIVE", "DEFENSIVE", "BALANCED"];

  for (let i = 0; i < 200; i++) {
    const before = store.getState();

    if (before.ui.screen === "GAME" && !before.game.transit.active && !before.game.over) {
      const nextDistrict = (before.game.playerDistrict + 1 + (i % 2)) % 7;
      store.dispatch({ type: "TRAVEL_TO", payload: { to: nextDistrict } });
    }

    if (!store.getState().game.over) {
      store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: actions[i % actions.length] } });
    }

    const enc = store.getState().game.encounter;
    if (enc.active) {
      const pick = enc.options[0];
      store.dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: {
          mode: pick?.mode || enc.required || "DECISION",
          optionId: pick?.id || ""
        }
      });
    }

    const combat = store.getState().game.combat;
    if (combat.active && combat.phase === "PREP") {
      store.dispatch({ type: "CHANGE_STANCE", payload: { stance: stances[i % stances.length] } });
      store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
    }

    if (i % 9 === 0 && !store.getState().game.over) {
      store.dispatch({ type: "INTERVENE", payload: { kind: "TRIGGER_RAID" } });
    }

    store.dispatch({ type: "SIM_STEP", payload: {} });

    if (store.getState().game.combat.phase === "RESOLVED") {
      store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    }
  }

  const final = store.getState();
  return {
    signature: store.getSignature(),
    snapshot: stableStringify({
      profile: final.app.releaseProfile,
      featureFlags: final.app.featureFlags,
      ui: final.ui,
      game: {
        round: final.game.round,
        hp: final.game.hp,
        supplies: final.game.supplies,
        morale: final.game.morale,
        transit: final.game.transit,
        encounter: final.game.encounter,
        combat: final.game.combat,
        resources: final.game.resources,
        quests: final.game.quests,
        stats: final.game.stats,
        winLose: final.game.winLose,
        substrate: final.game.substrate
      }
    })
  };
}

const PROFILES = ["alpha", "beta", "rc"];

for (const profile of PROFILES) {
  const a = runScenario({ seed: `matrix-${profile}-A`, profile });
  const b = runScenario({ seed: `matrix-${profile}-A`, profile });
  const c = runScenario({ seed: `matrix-${profile}-B`, profile });

  assert(a.signature === b.signature, `${profile}: same seed must keep signature stable`);
  assert(a.snapshot === b.snapshot, `${profile}: same seed must keep snapshot stable`);
  assert(a.signature !== c.signature || a.snapshot !== c.snapshot, `${profile}: different seeds must diverge`);
}

console.log("SEED_REPRO_MATRIX_OK");
