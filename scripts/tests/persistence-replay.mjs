import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { stableStringify } from "../../src/kernel/stableStringify.js";
import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createMemoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function createFileDriver(filePath) {
  return {
    load() {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    },
    save(next) {
      fs.writeFileSync(filePath, JSON.stringify(next), "utf8");
    }
  };
}

function makeInitialDoc(seed, profile = "beta") {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed }, app: { releaseProfile: profile } }
  };
}

function createScenarioStore(storageDriver, seed, profile = "beta") {
  return createStore(
    manifest,
    { reducer, simStep },
    {
      actionAdapter: adaptLegacyAction,
      storageDriver,
      // deterministic guard remains on default true
    }
  );
}

function bootToGame(store) {
  store.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: "beta" } });
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

function runSegment(store, fromStep, toStep) {
  const choices = ["SCOUT", "FORAGE", "REST"];
  const stances = ["AGGRESSIVE", "DEFENSIVE", "BALANCED"];

  for (let i = fromStep; i < toStep; i++) {
    const st = store.getState();

    if (st.ui.screen === "GAME" && !st.game.transit.active && !st.game.over) {
      store.dispatch({ type: "TRAVEL_TO", payload: { to: (st.game.playerDistrict + 1 + (i % 2)) % 7 } });
    }

    if (!store.getState().game.over) {
      store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
    }

    const enc = store.getState().game.encounter;
    if (enc.active) {
      const option = enc.options[0];
      store.dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: { mode: option?.mode || enc.required || "DECISION", optionId: option?.id || "" }
      });
    }

    const combat = store.getState().game.combat;
    if (combat.active && combat.phase === "PREP") {
      store.dispatch({ type: "CHANGE_STANCE", payload: { stance: stances[i % stances.length] } });
      store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
    }

    store.dispatch({ type: "SIM_STEP", payload: {} });

    if (store.getState().game.combat.phase === "RESOLVED") {
      store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    }
  }
}

function takeResult(store) {
  const doc = store.getDoc();
  return {
    signature: store.getSignature(),
    revisionCount: doc.revisionCount,
    snapshot: stableStringify(store.getState())
  };
}

function runContinuous(seed, driverFactory) {
  const driver = driverFactory();
  const s = createScenarioStore(driver, seed);
  bootToGame(s);
  runSegment(s, 0, 160);
  return takeResult(s);
}

function runReplay(seed, driverFactory, checkpointStep = 80) {
  const driverA = driverFactory();
  const sA = createScenarioStore(driverA, seed);
  bootToGame(sA);
  runSegment(sA, 0, checkpointStep);
  const checkpointDoc = sA.getDoc();

  const driverB = driverFactory(checkpointDoc);
  const sB = createScenarioStore(driverB, seed);
  runSegment(sB, checkpointStep, 160);
  return takeResult(sB);
}

function verifyDriverReplay(label, continuousResult, replayResult) {
  assert(
    continuousResult.signature === replayResult.signature,
    `${label}: replay signature mismatch (${continuousResult.signature} != ${replayResult.signature})`
  );
  assert(
    continuousResult.revisionCount === replayResult.revisionCount,
    `${label}: replay revision mismatch (${continuousResult.revisionCount} != ${replayResult.revisionCount})`
  );
  assert(continuousResult.snapshot === replayResult.snapshot, `${label}: replay snapshot mismatch`);
}

const seed = "persistence-replay-seed";

{
  const continuous = runContinuous(seed, (initial = makeInitialDoc(seed)) => createMemoryDriver(initial));
  const replayed = runReplay(seed, (initial = makeInitialDoc(seed)) => createMemoryDriver(initial));
  verifyDriverReplay("memory", continuous, replayed);
}

{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "substrate-replay-"));
  const file = path.join(tmpDir, "state.json");
  const continuous = runContinuous(seed, (initial = makeInitialDoc(seed)) => {
    fs.writeFileSync(file, JSON.stringify(initial), "utf8");
    return createFileDriver(file);
  });
  const replayed = runReplay(seed, (initial = makeInitialDoc(seed)) => {
    fs.writeFileSync(file, JSON.stringify(initial), "utf8");
    return createFileDriver(file);
  });
  verifyDriverReplay("file", continuous, replayed);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

console.log("PERSISTENCE_REPLAY_OK");
