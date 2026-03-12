import { createStore } from "../../src/kernel/store.js";
import { manifest as unifiedManifest } from "../../src/project/unified.manifest.js";
import { reducer as unifiedReducer, simStep as unifiedSimStep } from "../../src/project/project.logic.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertThrows(fn, label, match = null) {
  let thrown = null;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  assert(!!thrown, `${label}: expected throw`);
  if (match) {
    assert(match.test(String(thrown.message || thrown)), `${label}: unexpected error '${thrown?.message || thrown}'`);
  }
}

function memoryDriver() {
  let doc = null;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function failingSaveDriver() {
  let doc = null;
  return {
    load() { return doc; },
    save() { throw new Error("SAVE_FAIL"); }
  };
}

function makeStore(manifest, project, opts = {}) {
  return createStore(
    manifest,
    project,
    { storageDriver: memoryDriver(), actionAdapter: adaptLegacyAction, ...opts }
  );
}

// 1) Unknown action must be rejected.
{
  const s = makeStore(unifiedManifest, { reducer: unifiedReducer, simStep: unifiedSimStep });
  assertThrows(() => s.dispatch({ type: "UNKNOWN_LEGACY_HACK", payload: {} }), "unknown action", /Unknown action type/i);
}

// 2) Manifest contract: actionSchema entry without mutationMatrix entry must fail on createStore.
{
  const badManifest = {
    SCHEMA_VERSION: 1,
    stateSchema: { type: "object", shape: { meta: { type: "object", shape: { seed: { type: "string", default: "x" } } } } },
    actionSchema: { FOO: { type: "object", shape: {} } },
    mutationMatrix: {}
  };
  assertThrows(() => makeStore(badManifest, { reducer: () => [], simStep: () => [] }), "manifest contract", /mutationMatrix missing array/i);
}

// 3) Unsafe patch path (__proto__) must be blocked.
{
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: { meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } }, game: { type: "object", shape: { hp: { type: "number", default: 1 } } } }
    },
    actionSchema: { HACK: { type: "object", shape: {} }, SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { HACK: ["/game"], SIM_STEP: ["/game"] }
  };
  const s = makeStore(m, {
    reducer: (state, action) => action.type === "HACK" ? [{ op: "set", path: "/__proto__/polluted", value: 1 }] : [],
    simStep: () => []
  });
  assertThrows(() => s.dispatch({ type: "HACK", payload: {} }), "unsafe path", /Unsafe patch path segment/i);
}

// 4) Root container replacement must be blocked.
{
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: { meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } }, game: { type: "object", shape: { hp: { type: "number", default: 1 } } } }
    },
    actionSchema: { HACK: { type: "object", shape: {} }, SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { HACK: ["/game"], SIM_STEP: ["/game"] }
  };
  const s = makeStore(m, {
    reducer: (state, action) => action.type === "HACK" ? [{ op: "set", path: "/game", value: { hp: 999 } }] : [],
    simStep: () => []
  });
  assertThrows(() => s.dispatch({ type: "HACK", payload: {} }), "root replace", /Root container replace blocked/i);
}

// 5) Non-determinism source in reducer must be blocked.
{
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: {
        meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } },
        game: { type: "object", shape: { hp: { type: "number", default: 1 } } }
      }
    },
    actionSchema: { ROLL: { type: "object", shape: {} }, SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { ROLL: ["/game/hp"], SIM_STEP: ["/game/hp"] }
  };
  const s = makeStore(m, {
    reducer: (state, action) => {
      if (action.type === "ROLL") {
        const n = Math.random();
        return [{ op: "set", path: "/game/hp", value: n > 0.5 ? 2 : 1 }];
      }
      return [];
    },
    simStep: () => []
  });
  assertThrows(() => s.dispatch({ type: "ROLL", payload: {} }), "determinism reducer", /Non-deterministic source blocked/i);
}

// 6) Non-determinism source in simStep must be blocked.
{
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: {
        meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } },
        game: { type: "object", shape: { hp: { type: "number", default: 1 } } }
      }
    },
    actionSchema: { SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { SIM_STEP: ["/game/hp"] }
  };
  const s = makeStore(m, {
    reducer: () => [],
    simStep: () => {
      const t = Date.now();
      return [{ op: "set", path: "/game/hp", value: t % 2 ? 1 : 2 }];
    }
  });
  assertThrows(() => s.dispatch({ type: "SIM_STEP", payload: {} }), "determinism simStep", /Non-deterministic source blocked/i);
}

// 7) getDoc() must not expose mutable internal doc.
{
  const s = makeStore(unifiedManifest, { reducer: unifiedReducer, simStep: unifiedSimStep });
  s.dispatch({ type: "START_GAME", payload: {} });
  const before = s.getSignature();
  const leaked = s.getDoc();
  assertThrows(() => { leaked.state.app.firstStart = true; }, "getDoc readonly state");
  assertThrows(() => { leaked.revisionCount = 99999; }, "getDoc readonly revision");
  assertThrows(() => { leaked.schemaVersion = -1; }, "getDoc readonly schemaVersion");
  const after = s.getSignature();
  assert(before === after, "getDoc leak: internal doc/signature changed from external mutation");
}

// 8) Save failure must not commit in-memory doc (atomic commit).
{
  const s = createStore(
    unifiedManifest,
    { reducer: unifiedReducer, simStep: unifiedSimStep },
    { storageDriver: failingSaveDriver(), actionAdapter: adaptLegacyAction }
  );
  const before = s.getDoc();
  assertThrows(() => s.dispatch({ type: "START_GAME", payload: {} }), "save fail should throw", /SAVE_FAIL/i);
  const after = s.getDoc();
  assert(before.revisionCount === after.revisionCount, "atomic save: revision changed despite save failure");
  assert(before.state.ui.screen === after.state.ui.screen, "atomic save: state changed despite save failure");
}

// 9) Non-determinism source crypto.getRandomValues must be blocked (when available).
if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: {
        meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } },
        game: { type: "object", shape: { hp: { type: "number", default: 1 } } }
      }
    },
    actionSchema: { ROLL: { type: "object", shape: {} }, SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { ROLL: ["/game/hp"], SIM_STEP: ["/game/hp"] }
  };
  const s = makeStore(m, {
    reducer: (state, action) => {
      if (action.type === "ROLL") {
        const a = new Uint8Array(1);
        globalThis.crypto.getRandomValues(a);
        return [{ op: "set", path: "/game/hp", value: a[0] > 127 ? 2 : 1 }];
      }
      return [];
    },
    simStep: () => []
  });
  assertThrows(() => s.dispatch({ type: "ROLL", payload: {} }), "determinism crypto.getRandomValues", /Non-deterministic source blocked/i);
}

// 10) Non-determinism source crypto.randomUUID must be blocked (when available).
if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
  const m = {
    SCHEMA_VERSION: 1,
    stateSchema: {
      type: "object",
      shape: {
        meta: { type: "object", shape: { seed: { type: "string", default: "seed" } } },
        game: { type: "object", shape: { hp: { type: "number", default: 1 } } }
      }
    },
    actionSchema: { SIM_STEP: { type: "object", shape: {} } },
    mutationMatrix: { SIM_STEP: ["/game/hp"] }
  };
  const s = makeStore(m, {
    reducer: () => [],
    simStep: () => {
      const id = globalThis.crypto.randomUUID();
      return [{ op: "set", path: "/game/hp", value: id.length % 2 ? 1 : 2 }];
    }
  });
  assertThrows(() => s.dispatch({ type: "SIM_STEP", payload: {} }), "determinism crypto.randomUUID", /Non-deterministic source blocked/i);
}

console.log("GATE_REDTEAM_OK");
