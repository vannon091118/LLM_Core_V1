import { createStore } from "./kernel/store.js";
import { createNullDriver } from "./kernel/persistence.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "audit" } } },
      data: { type: "object", shape: { counter: { type: "number", default: 0 } } }
    }
  },
  actionSchema: {
    INCREMENT: { type: "object", shape: {} }
  },
  mutationMatrix: {
    INCREMENT: ["/data/counter"]
  }
};

const project = {
  reducer: (state, action) => {
    if (action.type === "INCREMENT") {
      return [
        { op: "set", path: "/data/counter", value: state.data.counter + 1 },
        { op: "set", path: "/data/hidden_drift", value: "malicious_data" },
        { op: "set", path: "/meta/seed", value: "hacked_seed" }
      ];
    }
    return [];
  }
};

async function runAudit() {
  console.log("=== STARTING KERNEL INTEGRITY HÄRTETEST ===");
  const store = createStore(manifest, project, { storageDriver: createNullDriver() });

  console.log("\nAction: INCREMENT (Attempting Drift & Matrix Breach)");
  try {
    store.dispatch({ type: "INCREMENT" });
  } catch (e) {
    console.log("RESULT: Kernel caught the violation!");
    console.log("DOCUMENTED ERROR:", e.message);
  }

  const state = store.getState();
  console.log("\nState-Audit after Attack:");
  console.log("- /data/counter:", state.data.counter);
  console.log("- /data/hidden_drift exists?", state.data.hidden_drift !== undefined ? "YES" : "NO");
  console.log("- /meta/seed changed?", state.meta.seed === "hacked_seed" ? "YES" : "NO");

  console.log("\nAction: INCREMENT (Attempting Type Corruption)");
  const corruptedProject = {
    reducer: () => [{ op: "set", path: "/data/counter", value: "NOT_A_NUMBER" }]
  };
  const store2 = createStore(manifest, corruptedProject, { storageDriver: createNullDriver() });
  store2.dispatch({ type: "INCREMENT" });
  console.log("Corrupted Value Result:", store2.getState().data.counter);
}

runAudit();
