import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function inRange(n, min, max) {
  return Number.isFinite(n) && n >= min && n <= max;
}

function memoryDriver() {
  let doc = null;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function makeStore() {
  return createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver() }
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

function assertCoreInvariants(state) {
  const g = state.game;
  assert(g.maxHp >= 1 && g.maxHp <= 99, "maxHp out of range");
  assert(inRange(g.hp, 0, g.maxHp), "hp out of range");
  assert(inRange(g.supplies, 0, 99), "supplies out of range");
  assert(g.supplies === g.resources.supplies, "supplies must stay in sync with resources.supplies");
  assert(inRange(g.morale, 0, 99), "morale out of range");
  assert(inRange(g.round, 0, 9999), "round out of range");
  assert(["MAIN_MENU", "RULES", "LOADOUT_SELECTION", "DIALOG", "GAME"].includes(state.ui.screen), "ui.screen invalid");
  assert(["KAMPF", "DIALOG", "PLUENDERN"].includes(g.panelMode), "panelMode invalid");
  assert(["ONGOING", "WIN", "LOSE"].includes(g.winLose.state), "winLose.state invalid");
  assert(["NONE", "PREP", "ACTIVE", "RESOLVED"].includes(g.combat.phase), "combat.phase invalid");
  assert(["AGGRESSIVE", "DEFENSIVE", "BALANCED"].includes(g.combat.stance), "combat.stance invalid");

  const s = g.substrate;
  assert(inRange(s.influenceMax, 1, 50), "influenceMax out of range");
  assert(inRange(s.influence, 0, s.influenceMax), "influence out of range");
  assert(inRange(s.zeroInfluenceTicks, 0, 9999), "zeroInfluenceTicks out of range");
  assert(inRange(s.alivePct, 0, 100), "alivePct out of range");
  assert(inRange(s.lightPct, 0, 100), "lightPct out of range");
  assert(inRange(s.toxinPct, 0, 100), "toxinPct out of range");
  assert(inRange(s.lineageControlPct, 0, 100), "lineageControlPct out of range");
  assert(inRange(s.mutationLevel, 0, 9), "mutationLevel out of range");

  assert(g.log.length <= 16, "game.log too long");
  assert(g.encounter.options.length <= 4, "encounter options too long");
  assert(g.combat.logLines.length <= 8, "combat log too long");
}

const store = makeStore();
bootToGame(store);

const choices = ["SCOUT", "FORAGE", "REST"];
const interventions = [
  "LIGHT_PULSE",
  "NUTRIENT_INJECTION",
  "TOXIN_ABSORB",
  "STRENGTHEN_LINEAGE",
  "TRIGGER_RAID",
  "BUILD_BRIDGE",
  "QUARANTINE_ZONE"
];

for (let i = 0; i < 80; i++) {
  const before = store.getState();
  const district = before.game.playerDistrict;
  if (before.ui.screen === "GAME" && !before.game.transit.active && !before.game.over) {
    store.dispatch({ type: "TRAVEL_TO", payload: { to: (district + 1 + (i % 2)) % 7 } });
  }

  if (!store.getState().game.over) {
    store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
  }

  const now = store.getState();
  if (now.game.encounter.active) {
    const selected = now.game.encounter.options[0];
    store.dispatch({
      type: "RESOLVE_ENCOUNTER",
      payload: {
        mode: selected?.mode || now.game.encounter.required || "DECISION",
        optionId: selected?.id || ""
      }
    });
  }

  const combat = store.getState().game.combat;
  if (combat.active && combat.phase === "PREP") {
    store.dispatch({ type: "CHANGE_STANCE", payload: { stance: i % 3 === 0 ? "AGGRESSIVE" : (i % 3 === 1 ? "DEFENSIVE" : "BALANCED") } });
    store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
  }
  if (i % 5 === 0 && !store.getState().game.over) {
    store.dispatch({ type: "INTERVENE", payload: { kind: interventions[i % interventions.length] } });
  }
  store.dispatch({ type: "SIM_STEP", payload: {} });
  if (store.getState().game.combat.phase === "RESOLVED") {
    store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
  }

  assertCoreInvariants(store.getState());
}

console.log("INVARIANTS_OK");
