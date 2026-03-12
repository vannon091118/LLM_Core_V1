import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";
import { advanceUiSimDeterministic } from "../../src/project/ui.js";

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

function bootStore() {
  const s = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver() }
  );
  s.dispatch({ type: "START_GAME", payload: {} });
  s.dispatch({ type: "ACCEPT_RULES", payload: {} });
  s.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  s.dispatch({ type: "NEXT_DIALOG", payload: {} });
  s.dispatch({ type: "NEXT_DIALOG", payload: {} });
  s.dispatch({ type: "NEXT_DIALOG", payload: {} });
  s.dispatch({ type: "TRAVEL_TO", payload: { to: 1 } });
  return s;
}

function runFramePattern(pattern) {
  const s = bootStore();
  let acc = 0;
  for (const dt of pattern) {
    acc = advanceUiSimDeterministic(s, acc, dt);
  }
  return {
    sig: s.getSignature(),
    rev: s.getDoc().revisionCount,
    progress: s.getState().game.transit.progress,
    active: s.getState().game.transit.active,
    acc
  };
}

// Same total time, different frame segmentation must produce identical result.
const pA = runFramePattern([129, 131]);
const pB = runFramePattern([130, 130]);
assert(pA.sig === pB.sig, `timing segmentation drift (260ms): ${pA.sig} vs ${pB.sig}`);
assert(pA.rev === pB.rev, `revision drift (260ms): ${pA.rev} vs ${pB.rev}`);

const pC = runFramePattern([60, 70, 40, 90, 130]);
const pD = runFramePattern([130, 130, 130]);
assert(pC.sig === pD.sig, `timing segmentation drift (390ms): ${pC.sig} vs ${pD.sig}`);
assert(pC.rev === pD.rev, `revision drift (390ms): ${pC.rev} vs ${pD.rev}`);

const pE = runFramePattern([43.4, 43.4, 43.4]);
const pF = runFramePattern([130.2]);
assert(pE.sig === pF.sig, `fractional timing drift (130.2ms): ${pE.sig} vs ${pF.sig}`);
assert(pE.rev === pF.rev, `fractional revision drift (130.2ms): ${pE.rev} vs ${pF.rev}`);

console.log("DETERMINISM_UI_TIMING_OK");
