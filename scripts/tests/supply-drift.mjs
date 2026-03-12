import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";
import { DISTRICT_LOOT_CONTAINERS } from "../../src/project/inventory.module.js";

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

function assertSupplySync(state, hint) {
  const left = state.game.supplies;
  const right = state.game.resources.supplies;
  assert(left === right, `${hint}: supplies drift (${left} != ${right})`);
  assert(left >= 0 && left <= 99, `${hint}: supplies out of range (${left})`);
}

function runScenario(seed) {
  const store = makeStore(seed);
  bootToGame(store);
  const checkpoints = [];

  for (let i = 0; i < 120; i++) {
    const s = store.getState();
    assertSupplySync(s, `step ${i} pre`);

    if (s.game.supplies < 4) {
      store.dispatch({ type: "APPLY_RESOURCE_DELTA", payload: { supplies: 4, ammo: 1 } });
    } else if (i % 4 === 0) {
      store.dispatch({ type: "APPLY_RESOURCE_DELTA", payload: { supplies: -2, scrap: 1 } });
    }

    if (i % 9 === 0) {
      const decisionId = `supply_check_${i}`;
      store.dispatch({ type: "QUEUE_DECISION", payload: { decisionId, chainId: "supply_guard" } });
      store.dispatch({
        type: "RESOLVE_DECISION_OUTCOME",
        payload: {
          decisionId,
          optionId: "opt",
          outcome: i % 18 === 0 ? "FAIL" : "CRITICAL"
        }
      });
    }

    const now = store.getState();
    if (!now.game.over && !now.game.transit.active && !now.game.encounter.active && !now.game.combat.active) {
      if (i % 3 === 0) {
        const district = now.game.playerDistrict;
        const containers = DISTRICT_LOOT_CONTAINERS[district] || [];
        if (containers.length > 0) {
          const containerId = containers[0];
          store.dispatch({ type: "REGISTER_LOOT_CONTAINER", payload: { districtId: district, containerId } });
          store.dispatch({ type: "OPEN_LOOT_CONTAINER", payload: { containerId: `${district}:${containerId}` } });
        }
      } else if (i % 2 === 0) {
        store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: "FORAGE" } });
      } else {
        store.dispatch({ type: "TRAVEL_TO", payload: { to: (now.game.playerDistrict + 1) % 7 } });
      }
    }

    const maybeEncounter = store.getState();
    if (maybeEncounter.game.encounter.active) {
      const selected = maybeEncounter.game.encounter.options[0];
      store.dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: {
          mode: selected?.mode || maybeEncounter.game.encounter.required || "DECISION",
          optionId: selected?.id || ""
        }
      });
    }

    const combat = store.getState().game.combat;
    if (combat.active && combat.phase === "PREP") {
      store.dispatch({ type: "CHANGE_STANCE", payload: { stance: i % 2 ? "BALANCED" : "DEFENSIVE" } });
      store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
    }
    if (combat.active && combat.phase === "ACTIVE" && i % 7 === 0) {
      store.dispatch({ type: "USE_EMERGENCY_ITEM", payload: {} });
    }

    store.dispatch({ type: "SIM_STEP", payload: {} });

    const after = store.getState();
    if (after.game.combat.phase === "RESOLVED") {
      store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    }

    const snap = store.getState();
    assertSupplySync(snap, `step ${i} post`);
    checkpoints.push(`${snap.game.round}:${snap.game.supplies}:${snap.game.resources.supplies}`);

    if (snap.game.over && snap.game.supplies < 2) {
      store.dispatch({ type: "APPLY_RESOURCE_DELTA", payload: { supplies: 3 } });
      store.dispatch({ type: "SET_GAME_OUTCOME", payload: { state: "ONGOING" } });
    }
  }

  return {
    signature: store.getSignature(),
    checkpoints: checkpoints.join("|")
  };
}

const a = runScenario("supply-drift-seed");
const b = runScenario("supply-drift-seed");

assert(a.signature === b.signature, "same seed should keep identical signature in supply drift scenario");
assert(a.checkpoints === b.checkpoints, "same seed should keep identical supply checkpoint track");

console.log("SUPPLY_DRIFT_OK");
