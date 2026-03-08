import { createStore } from "./kernel/store.js";
import { createNullDriver } from "./kernel/persistence.js";

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "redteam" } } },
      data: { type: "object", shape: { val: { type: "number", default: 0 } } },
      list: { type: "array", items: { type: "number" } }
    }
  },
  actionSchema: {
    ATTACK: { type: "object", shape: {} }
  },
  mutationMatrix: {
    ATTACK: ["/data/val", "/list"]
  }
};

const attacks = [
  { name: "Prototype Pollution", patch: { op: "set", path: "/__proto__/polluted", value: true } },
  { name: "Path Traversal", patch: { op: "set", path: "/data/../meta/seed", value: "hacked" } },
  { name: "Constructor Sabotage", patch: { op: "set", path: "/constructor/prototype/hacked", value: true } },
  { name: "Array Bomb", patch: { op: "set", path: "/list/999999", value: 1 } },
];

const project = {
  reducer: (state, action) => {
    if (action.type === "ATTACK") {
      return attacks.map(a => a.patch);
    }
    return [];
  }
};

async function runRedTeam() {
  console.log("=== KERNEL RED TEAM ATTACK SUITE ===");
  
  const store = createStore(manifest, project, { storageDriver: createNullDriver() });

  console.log("\n[PHASE 1: Patch Vectors]");
  try {
    store.dispatch({ type: "ATTACK" });
  } catch (e) {
    console.log("KERNEL DEFENSE ACTIVE:", e.message);
  }

  const state = store.getState();
  const polluted = ({}).polluted === true;
  console.log("Polluted Proto?", polluted ? "CRITICAL FAIL" : "SECURE");
  
  console.log("\n[PHASE 2: Recursion & Payload Attack]");
  try {
    const cycle = {};
    cycle.self = cycle;
    store.dispatch({ type: "ATTACK", payload: cycle });
  } catch (e) {
    console.log("Dispatcher handled cycle:", e.message);
  }

  console.log("\n[PHASE 3: Getter Logic Injection]");
  try {
    const logicPatch = { op: "set", path: "/data/val", value: { valueOf: () => { console.log("Logic Executed!"); return 1; } } };
    const logicProject = { reducer: () => [logicPatch] };
    const logicStore = createStore(manifest, logicProject, { storageDriver: createNullDriver() });
    logicStore.dispatch({ type: "ATTACK" });
    const val = logicStore.getState().data.val;
    const isNum = typeof val === "number";
    console.log("Logic Value Sanitized?", isNum ? "YES (SECURE)" : `NO (Type: ${typeof val})`);
  } catch (e) {
    console.log("Logic Injection Blocked:", e.message);
  }
}

runRedTeam();
