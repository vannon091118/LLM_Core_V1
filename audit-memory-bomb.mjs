import { createStore } from "./kernel/store.js";
import { createNullDriver } from "./kernel/persistence.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: { 
    type: "object", 
    shape: { 
      meta: { type: "object", shape: { seed: { type: "string", default: "bomb" } } },
      data: { type: "array", items: { type: "number" } } 
    } 
  },
  actionSchema: { BOMB: { type: "object", shape: {} } },
  mutationMatrix: { BOMB: ["/data"] }
};

const project = {
  reducer: () => {
    const bomb = new Uint8Array(60 * 1024 * 1024); 
    return [{ op: "set", path: "/data", value: bomb }];
  }
};

async function runBomb() {
  console.log("=== MEMORY BOMB AUDIT ===");
  const store = createStore(manifest, project, { storageDriver: createNullDriver() });
  try {
    store.dispatch({ type: "BOMB" });
    console.log("FAIL: Kernel swallowed the bomb.");
  } catch (e) {
    if (e.message.includes("exceeds safety limit")) {
      console.log("PASS: Kernel defused the bomb.");
    } else {
      console.log("FAIL: Unexpected error:", e.message);
    }
  }
}

runBomb();
