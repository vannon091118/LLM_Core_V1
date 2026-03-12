import { createStore } from "../kernel/store.js";
import { createNullDriver } from "../kernel/persistence.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: { type: "object", shape: { seed: { type: "string", default: "det-seed" } } },
      value: { type: "number", default: 0 }
    }
  },
  actionSchema: { TEST: { type: "object", shape: {} } },
  mutationMatrix: { TEST: ["/value"] }
};

function expectBlocked(name, reducer) {
  const store = createStore(manifest, { reducer }, { storageDriver: createNullDriver() });
  let blocked = false;
  try {
    store.dispatch({ type: "TEST", payload: {} });
  } catch (err) {
    blocked = /Non-deterministic source blocked/i.test(String(err?.message || ""));
  }
  assert(blocked, `${name} was not blocked`);
}

expectBlocked("Math.random", () => [{ op: "set", path: "/value", value: Math.random() }]);
expectBlocked("Date.now", () => [{ op: "set", path: "/value", value: Date.now() }]);
expectBlocked("new Date()", () => [{ op: "set", path: "/value", value: Number(new Date()) }]);
expectBlocked("performance.now", () => [{ op: "set", path: "/value", value: performance.now() }]);

if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
  expectBlocked("crypto.randomUUID", () => [{ op: "set", path: "/value", value: globalThis.crypto.randomUUID().length }]);
}

if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
  expectBlocked("crypto.getRandomValues", () => {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return [{ op: "set", path: "/value", value: arr[0] }];
  });
}

console.log("KERNEL_DETERMINISM_SOURCES_OK");
