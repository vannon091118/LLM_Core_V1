import { adaptLegacyAction } from "../../src/project/unified.adapters.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function checkMap(input, expectedType, expectedPayload = null) {
  const out = adaptLegacyAction(input);
  assert(out.type === expectedType, `Expected type ${expectedType}, got ${out.type}`);
  if (expectedPayload) {
    for (const [k, v] of Object.entries(expectedPayload)) {
      assert(out.payload?.[k] === v, `Expected payload.${k}=${v}, got ${out.payload?.[k]}`);
    }
  }
}

checkMap({ type: "START_RUN", payload: {} }, "START_GAME");
checkMap({ type: "PICK_LOADOUT", payload: { archetype: "FIGHTER" } }, "CHOOSE_LOADOUT", { loadout: "FIGHTER" });
checkMap({ type: "MOVE_TO_DISTRICT", payload: { districtId: 4 } }, "TRAVEL_TO", { to: 4 });
checkMap({ type: "RESOLVE_DECISION", payload: { required: "COMBAT", choiceId: "ambush" } }, "RESOLVE_ENCOUNTER", { mode: "COMBAT", optionId: "ambush" });
checkMap({ type: "APPLY_LIGHT_PULSE", payload: {} }, "INTERVENE", { kind: "LIGHT_PULSE" });
checkMap({ type: "STEP_SIMULATION", payload: {} }, "SIM_STEP");

const passthrough = adaptLegacyAction({ type: "CHOOSE_ACTION", payload: { choice: "SCOUT" } });
assert(passthrough.type === "CHOOSE_ACTION", "Known canonical action should pass through");

console.log("ADAPTER_SMOKE_OK");
