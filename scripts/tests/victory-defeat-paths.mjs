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

function baseDoc(seed) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      meta: { seed },
      app: { firstStart: false },
      ui: { screen: "GAME" },
      game: {
        over: false,
        round: 12,
        hp: 10,
        maxHp: 12,
        supplies: 8,
        morale: 8,
        playerDistrict: 6,
        transit: { active: false, from: 6, to: 6, progress: 0, cooldown: 0 },
        encounter: { active: false, required: "DECISION", text: "", decisionId: "", ageTicks: 0, timeoutTicks: 6, options: [] },
        combat: { active: false, phase: "NONE", stance: "BALANCED", enemyId: "", enemyName: "", enemyTier: 0, enemyHp: 0, enemyMaxHp: 0, tick: 0, logLines: [], pendingLootItemIds: [], selectedItemPower: 0, selectedItemKind: "", emergencyUsed: false, emergencyPenalty: false },
        resources: { supplies: 8, ammo: 0, meds: 0, scrap: 0, intel: 0, credits: 0, keys: [] },
        substrate: {
          influence: 12,
          influenceMax: 20,
          zeroInfluenceTicks: 0,
          alivePct: 70,
          lightPct: 70,
          toxinPct: 20,
          lineageControlPct: 50,
          mutationLevel: 3,
          lastIntervention: ""
        },
        stats: { combatsWon: 0, roundsSurvived: 0, combatsStarted: 0, combatsLost: 0, decisionsMade: 0, distanceTraveled: 0, containersOpened: 0, questsCompleted: 0 }
      }
    }
  };
}

function runCase(name, patchGame, expectedReason, expectedState = "WIN") {
  const doc = baseDoc(`path-${name}`);
  doc.state.game = { ...doc.state.game, ...patchGame };
  if (patchGame.resources) doc.state.game.resources = { ...baseDoc("x").state.game.resources, ...patchGame.resources };
  if (patchGame.substrate) doc.state.game.substrate = { ...baseDoc("y").state.game.substrate, ...patchGame.substrate };
  if (patchGame.stats) doc.state.game.stats = { ...baseDoc("z").state.game.stats, ...patchGame.stats };

  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(doc) }
  );

  store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: "REST" } });
  const st = store.getState();
  assert(st.game.over === true, `${name}: game should be over`);
  assert(st.game.winLose.state === expectedState, `${name}: state mismatch (${st.game.winLose.state})`);
  assert(st.game.winLose.reason === expectedReason, `${name}: reason mismatch (${st.game.winLose.reason})`);
}

runCase(
  "dominance",
  {
    round: 15,
    playerDistrict: 6,
    stats: { combatsWon: 7 },
    substrate: { lineageControlPct: 92, alivePct: 68, lightPct: 60, toxinPct: 22, mutationLevel: 4 }
  },
  "DOMINANCE_PATH"
);

runCase(
  "symbiosis",
  {
    round: 24,
    playerDistrict: 3,
    stats: { combatsWon: 2 },
    substrate: { lineageControlPct: 44, alivePct: 88, lightPct: 86, toxinPct: 6, mutationLevel: 4 }
  },
  "SYMBIOSIS_PATH"
);

runCase(
  "metamorphosis",
  {
    round: 20,
    playerDistrict: 5,
    stats: { combatsWon: 5 },
    substrate: { lineageControlPct: 55, alivePct: 64, lightPct: 52, toxinPct: 41, mutationLevel: 9 }
  },
  "METAMORPHOSIS_PATH"
);

runCase(
  "lineage-extinction-defeat",
  {
    round: 18,
    playerDistrict: 2,
    stats: { combatsWon: 1 },
    substrate: { lineageControlPct: 0, alivePct: 10, lightPct: 34, toxinPct: 66, mutationLevel: 6 }
  },
  "LINEAGE_EXTINCTION",
  "LOSE"
);

console.log("VICTORY_DEFEAT_PATHS_OK");
