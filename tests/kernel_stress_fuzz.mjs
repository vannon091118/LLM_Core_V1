import { createStore } from "../kernel/store.js";
import { createNullDriver } from "../kernel/persistence.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: { 
    type: "object", 
    shape: { 
      meta: { type: "object", shape: { seed: { type: "string", default: "fuzz" } } },
      val: { type: "number", default: 0 } 
    } 
  },
  actionSchema: { TEST: { type: "object", shape: {} } },
  mutationMatrix: { TEST: ["/val"] }
};

const badValues = [NaN, Infinity, undefined, null, {}, []];

console.log("=== KERNEL GENERIC FUZZING ===");
let handled = 0;

for (const val of badValues) {
  const project = {
    reducer: () => [{ op: "set", path: "/val", value: val }]
  };
  
  try {
    const store = createStore(manifest, project, { storageDriver: createNullDriver() });
    store.dispatch({ type: "TEST" });
    handled++;
  } catch (e) {
    // Also valid: kernel blocks unsafe container-replace writes.
    if (!String(e.message || "").includes("Root container replace blocked")) {
      console.error(`Kernel error on ${String(val)}:`, e.message);
      process.exit(1);
    }
    handled++;
  }
}
console.log(`Kernel handled ${handled}/${badValues.length} malformed payloads.`);
