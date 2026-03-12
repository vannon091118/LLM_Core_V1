import { applyPatches } from "../../src/kernel/patches.js";
import { sanitizeBySchema } from "../../src/kernel/schema.js";
import { reducer } from "../../src/project/project.logic.js";
import { stateSchema } from "../../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rng = {
  sim: { int: () => 0 },
  world: { int: () => 0 },
  cos: { int: () => 0 }
};

let state = sanitizeBySchema({}, stateSchema);
state = {
  ...state,
  ui: { ...state.ui, screen: "GAME" },
  game: {
    ...state.game,
    over: false,
    hp: 10,
    maxHp: 10,
    morale: 9,
    supplies: 6,
    resources: {
      ...state.game.resources,
      supplies: 6,
      ammo: 1,
      meds: 2,
      scrap: 3,
      intel: 4,
      credits: 5
    },
    transit: {
      ...state.game.transit,
      active: true,
      progress: 10
    },
    quests: {
      ...state.game.quests,
      trackedQuestId: "q_trace",
      active: [{ id: "q_trace", title: "Trace", status: "ACTIVE", progress: 10, goal: 40 }]
    },
    encounter: {
      ...state.game.encounter,
      active: true,
      required: "DECISION",
      decisionId: "signal_tower",
      options: [
        {
          id: "jam",
          label: "Signal stoeren",
          mode: "DECISION",
          costText: "-1",
          gainText: "+1",
          riskText: "Mittel",
          hpDelta: 0,
          suppliesDelta: 0,
          moraleDelta: 0,
          ammoDelta: 2,
          medsDelta: -1,
          scrapDelta: 3,
          intelDelta: 4,
          creditsDelta: 5,
          progressDelta: 20,
          questProgressDelta: 15
        }
      ]
    }
  }
};
state = sanitizeBySchema(state, stateSchema);

const patches = reducer(
  state,
  { type: "RESOLVE_ENCOUNTER", payload: { mode: "DECISION", optionId: "jam" } },
  { rng }
);
assert(Array.isArray(patches), "Reducer must return patches array");

let next = applyPatches(state, patches);
next = sanitizeBySchema(next, stateSchema);

assert(next.game.resources.ammo === 3, "AMMO delta not applied");
assert(next.game.resources.meds === 1, "MEDS delta not applied");
assert(next.game.resources.scrap === 6, "SCRAP delta not applied");
assert(next.game.resources.intel === 8, "INTEL delta not applied");
assert(next.game.resources.credits === 10, "CREDITS delta not applied");
assert(next.game.transit.progress === 30, "progress delta not applied");
assert(next.game.quests.active[0].progress === 25, "QUEST_PROGRESS delta not applied");
assert(next.game.decisions.lastOutcome === "SUCCESS", "Expected SUCCESS outcome");

console.log("DECISION_REWARDS_OK");
