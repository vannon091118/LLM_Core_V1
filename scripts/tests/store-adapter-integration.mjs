import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

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

const store = createStore(
  manifest,
  { reducer, simStep },
  { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver() }
);

store.dispatch({ type: "START_RUN", payload: {} });
assert(store.getState().ui.screen === "RULES", "START_RUN should map to START_GAME and open RULES on first start");

store.dispatch({ type: "ACCEPT_TERMS", payload: {} });
assert(store.getState().ui.screen === "LOADOUT_SELECTION", "ACCEPT_TERMS should map to ACCEPT_RULES");

store.dispatch({ type: "PICK_LOADOUT", payload: { loadout: "FIGHTER" } });
assert(store.getState().ui.screen === "DIALOG", "PICK_LOADOUT should map to CHOOSE_LOADOUT");
assert(store.getState().game.maxHp === 12, "FIGHTER loadout must set maxHp to 12");
assert(store.getState().game.hp === 12, "FIGHTER loadout must set hp to 12");
assert(
  store.getState().game.supplies === store.getState().game.resources.supplies,
  "loadout must keep supplies and resources.supplies in sync"
);

store.dispatch({ type: "ADVANCE_DIALOG", payload: {} });
store.dispatch({ type: "ADVANCE_DIALOG", payload: {} });
store.dispatch({ type: "ADVANCE_DIALOG", payload: {} });
assert(store.getState().ui.screen === "GAME", "ADVANCE_DIALOG should map to NEXT_DIALOG");

const before = store.getState().game.transit.active;
const fromBefore = store.getState().game.playerDistrict;
store.dispatch({ type: "MOVE_TO_DISTRICT", payload: { districtId: 1 } });
const travelState = store.getState();
const after = travelState.game.transit.active;
assert(before === false && after === true, "MOVE_TO_DISTRICT should map to TRAVEL_TO and activate transit");
assert(travelState.game.transit.from === fromBefore, "TRAVEL_TO should keep correct transit.from");
assert(travelState.game.transit.to === 1, "TRAVEL_TO should map districtId -> transit.to");
assert(travelState.game.transit.progress === 0, "TRAVEL_TO should reset transit.progress to 0");
assert(travelState.game.transit.cooldown === 2, "TRAVEL_TO should set transit cooldown");

let sawProgress = false;
let arrived = false;
for (let i = 0; i < 120; i++) {
  const st = store.getState();
  if (st.game.over) break;

  if (st.game.encounter.active) {
    const selected = st.game.encounter.options[0];
    store.dispatch({
      type: "RESOLVE_ENCOUNTER",
      payload: {
        mode: selected?.mode || st.game.encounter.required || "DECISION",
        optionId: selected?.id || ""
      }
    });
  }

  const combat = store.getState().game.combat;
  if (combat.active && combat.phase === "PREP") {
    store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
  }
  if (store.getState().game.combat.phase === "RESOLVED") {
    store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
  }

  // Legacy adapter path for SIM_STEP.
  store.dispatch({ type: "STEP_SIMULATION", payload: {} });

  const now = store.getState();
  if (now.game.transit.progress > 0) sawProgress = true;
  if (!now.game.transit.active && now.game.playerDistrict === 1) {
    arrived = true;
    break;
  }
}

assert(sawProgress, "legacy STEP_SIMULATION should advance transit behavior");
assert(arrived, "travel should eventually arrive at target district");

console.log("STORE_ADAPTER_INTEGRATION_OK");
