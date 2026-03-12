import { stableStringify } from "../../src/kernel/stableStringify.js";
import { createStore } from "../../src/kernel/store.js";
import { createRngStreamsScoped } from "../../src/kernel/rng.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer as baseReducer, simStep as baseSimStep } from "../../src/project/project.logic.js";

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

function makeInitialDoc(seed, profile = "beta") {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed }, app: { releaseProfile: profile } }
  };
}

function wrapRngUsage(rng, meta) {
  if (!rng || typeof rng !== "object") return rng;
  const wrapped = {};
  for (const [k, v] of Object.entries(rng)) {
    if (typeof v !== "function") {
      wrapped[k] = v;
      continue;
    }
    wrapped[k] = (...args) => {
      meta.used = true;
      return v(...args);
    };
  }
  return wrapped;
}

function buildTraceProject(traceOut) {
  return {
    reducer(state, action, ctx = {}) {
      const rngMeta = { used: false };
      const preState = stableStringify(state);
      const patches = baseReducer(state, action, { ...ctx, rng: wrapRngUsage(ctx.rng, rngMeta) });
      traceOut.push({
        phase: "reducer",
        actionType: action.type,
        preState,
        rngUsed: rngMeta.used,
        patches: JSON.parse(JSON.stringify(patches || []))
      });
      return patches;
    },
    simStep(state, ctx = {}) {
      const rngMeta = { used: false };
      const preState = stableStringify(state);
      const patches = baseSimStep(state, { ...ctx, rng: wrapRngUsage(ctx.rng, rngMeta) });
      traceOut.push({
        phase: "simStep",
        actionType: "SIM_STEP",
        preState,
        rngUsed: rngMeta.used,
        patches: JSON.parse(JSON.stringify(patches || []))
      });
      return patches;
    }
  };
}

function runWithTrace(seed) {
  const trace = [];
  const store = createStore(
    manifest,
    buildTraceProject(trace),
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(makeInitialDoc(seed)) }
  );

  store.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: "beta" } });
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });

  const choices = ["SCOUT", "FORAGE", "REST"];
  const stances = ["AGGRESSIVE", "DEFENSIVE", "BALANCED"];
  const interventions = ["LIGHT_PULSE", "NUTRIENT_INJECTION", "TOXIN_ABSORB", "BUILD_BRIDGE"];
  const actionTape = [];
  for (let i = 0; i < 120; i++) {
    actionTape.push({ type: "TRAVEL_TO", payload: { to: (i + 1) % 7 } });
    actionTape.push({ type: "CHOOSE_ACTION", payload: { choice: choices[i % choices.length] } });
    actionTape.push({ type: "RESOLVE_ENCOUNTER", payload: { mode: "DECISION", optionId: "" } });
    actionTape.push({ type: "CHANGE_STANCE", payload: { stance: stances[i % stances.length] } });
    actionTape.push({ type: "BEGIN_COMBAT", payload: {} });
    actionTape.push({ type: "INTERVENE", payload: { kind: interventions[i % interventions.length] } });
    actionTape.push({ type: "SIM_STEP", payload: {} });
    actionTape.push({ type: "COLLECT_COMBAT_LOOT", payload: {} });
  }
  for (const action of actionTape) {
    store.dispatch(action);
  }

  return {
    signature: store.getSignature(),
    trace,
    traceHash: stableStringify(trace)
  };
}

function compareSeedDivergence(base, other) {
  const max = Math.min(base.trace.length, other.trace.length);
  for (let i = 0; i < max; i++) {
    const a = base.trace[i];
    const b = other.trace[i];
    if (a.phase !== b.phase || a.actionType !== b.actionType) {
      throw new Error(`trace shape mismatch at index ${i}: ${a.phase}/${a.actionType} != ${b.phase}/${b.actionType}`);
    }
    const patchA = stableStringify(a.patches);
    const patchB = stableStringify(b.patches);
    if (patchA !== patchB) {
      const samePreState = a.preState === b.preState;
      assert(
        (a.rngUsed || b.rngUsed) || !samePreState,
        `seed-divergent patch without RNG and without pre-state divergence at index ${i} (${a.phase}:${a.actionType})`
      );
    }
  }
}

const a = runWithTrace("patch-trace-seed-A");
const b = runWithTrace("patch-trace-seed-A");
const c = runWithTrace("patch-trace-seed-B");

assert(a.signature === b.signature, "same seed signature mismatch");
assert(a.traceHash === b.traceHash, "same seed patch trace mismatch");
assert(a.trace.length === b.trace.length, "same seed trace length mismatch");

compareSeedDivergence(a, c);
assert(a.signature !== c.signature || a.traceHash !== c.traceHash, "different seeds should not produce identical trace+signature");

console.log("PATCH_TRACE_OK");
