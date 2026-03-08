import { createStore } from "./kernel/store.js";
import { createNullDriver } from "./kernel/persistence.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "war" } } },
      data: { type: "object", shape: { nested: { type: "object", shape: { val: { type: "number" } } } } }
    }
  },
  actionSchema: { TEST: { type: "object", shape: {} } },
  mutationMatrix: { TEST: ["/data", "/data/nested"] }
};

const project = {
  reducer: (state, action) => {
    return [];
  }
};

async function runTotalWar() {
  console.log("=== TOTAL WAR AUDIT ===");
  const store = createStore(manifest, project, { storageDriver: createNullDriver() });

  // ATTACK 1
  console.log("[ATTACK 1] Direct State Mutation");
  const state = store.getState();
  try {
    state.meta.seed = "POISONED";
    console.log("Write to getState() succeeded.");
  } catch (e) {
    console.log("Write blocked by Freeze:", e.message);
  }
  
  const state2 = store.getState();
  if (state2.meta.seed === "POISONED") {
    console.error("CRITICAL FAIL: Kernel internal state was poisoned directly!");
  } else {
    console.log("PASS: State remained pure.");
  }

  // ATTACK 2
  console.log("[ATTACK 2] Constructor Poisoning via Patch");
  const p2 = {
    reducer: () => [{ op: "set", path: "/data/constructor/prototype/polluted", value: true }]
  };
  const store2 = createStore(manifest, p2, { storageDriver: createNullDriver() });
  try {
    store2.dispatch({ type: "TEST" });
    console.log("Dispatch success (Suspicious...)");
  } catch (e) {
    console.log("Kernel blocked constructor path:", e.message);
  }
  if (({}).polluted) console.error("CRITICAL FAIL: Prototype polluted!");
  else console.log("PASS: Prototype clean.");

  // ATTACK 3
  console.log("[ATTACK 3] Deep Object Drift");
  const p3 = {
    reducer: () => [{ 
      op: "set", 
      path: "/data/nested", 
      value: { val: 1, hidden: "DRIFT" } 
    }]
  };
  const store3 = createStore(manifest, p3, { storageDriver: createNullDriver() });
  store3.dispatch({ type: "TEST" });
  const s3 = store3.getState();
  if (s3.data.nested.hidden) console.error("FAIL: Sanitizer missed deep key.");
  else console.log("PASS: Sanitizer cleaned deep object.");
}

runTotalWar();
