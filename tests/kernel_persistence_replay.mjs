import { createStore } from "../kernel/store.js";
import { stableStringify } from "../kernel/stableStringify.js";
import { createMemoryDriver, assertReplayParity } from "./utils/scenario-harness.mjs";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "replay-seed" } } },
      data: { type: "object", shape: { counter: { type: "number", default: 0 }, noise: { type: "number", default: 0 } } }
    }
  },
  actionSchema: {
    STEP: { type: "object", shape: {} }
  },
  mutationMatrix: {
    STEP: ["/data/counter", "/data/noise"]
  }
};

const project = {
  reducer: (state, action, ctx) => {
    if (action.type !== "STEP") return [];
    return [
      { op: "set", path: "/data/counter", value: state.data.counter + 1 },
      { op: "set", path: "/data/noise", value: ctx.rng.sim.f01() }
    ];
  }
};

function runSteps(store, count) {
  for (let i = 0; i < count; i++) {
    store.dispatch({ type: "STEP", payload: {} });
  }
}

function signaturePack(store) {
  const doc = store.getDoc();
  return {
    signature: store.getSignature(),
    revisionCount: doc.revisionCount,
    snapshot: stableStringify(store.getState())
  };
}

function makeInitialDoc(seed) {
  return {
    schemaVersion: 1,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      meta: { seed },
      data: { counter: 0, noise: 0 }
    }
  };
}

const seed = "core-replay-seed";

const continuousDriver = createMemoryDriver(makeInitialDoc(seed));
const continuousStore = createStore(manifest, project, { storageDriver: continuousDriver });
runSteps(continuousStore, 180);
const continuous = signaturePack(continuousStore);

const splitDriverA = createMemoryDriver(makeInitialDoc(seed));
const splitStoreA = createStore(manifest, project, { storageDriver: splitDriverA });
runSteps(splitStoreA, 90);
const checkpoint = splitStoreA.getDoc();

const splitDriverB = createMemoryDriver(checkpoint);
const splitStoreB = createStore(manifest, project, { storageDriver: splitDriverB });
runSteps(splitStoreB, 90);
const replay = signaturePack(splitStoreB);

assertReplayParity(continuous, replay, "kernel persistence replay");

console.log("KERNEL_PERSISTENCE_REPLAY_OK");
