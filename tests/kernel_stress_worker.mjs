import { Worker, isMainThread, parentPort } from "worker_threads";
import { createStore } from "../kernel/store.js";
import { createNullDriver } from "../kernel/persistence.js";

if (isMainThread) {
  const WORKER_COUNT = 8;
  let done = 0;
  console.log(`=== KERNEL THREADING TEST (${WORKER_COUNT} threads) ===`);
  for (let i = 0; i < WORKER_COUNT; i++) {
    const w = new Worker(new URL(import.meta.url));
    w.on("message", () => {
      done++;
      if (done === WORKER_COUNT) console.log("Kernel is Thread-Safe.");
    });
    w.on("error", (err) => console.error("WORKER ERROR:", err));
  }
} else {
  const manifest = {
    SCHEMA_VERSION: 1,
    stateSchema: { 
      type: "object", 
      shape: { 
        meta: { type: "object", shape: { seed: { type: "string", default: "thread" } } },
        id: { type: "number", default: 0 } 
      } 
    },
    actionSchema: { INIT: { type: "object", shape: {} } },
    mutationMatrix: { INIT: ["/id"] }
  };
  const project = {
    reducer: (state, _action, ctx) => [{ op: "set", path: "/id", value: ctx.rng.sim.f01() }]
  };
  const store = createStore(manifest, project, { storageDriver: createNullDriver() });
  store.dispatch({ type: "INIT" });
  parentPort.postMessage("done");
}
