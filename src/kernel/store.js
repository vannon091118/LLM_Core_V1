import { stableStringify } from "./stableStringify.js";
import { hash32 } from "./hash32.js";
import { applyPatches, assertPatchesAllowed } from "./patches.js";
import { sanitizeBySchema } from "./schema.js";
import { createRngStreamsScoped } from "./rng.js";
import { getDefaultDriver } from "./persistence.js";

export function createStore(manifest, project, options = {}) {
  const { SCHEMA_VERSION, stateSchema, actionSchema, mutationMatrix } = manifest;
  assertManifestContracts(manifest);
  const driver = options.storageDriver || getDefaultDriver();
  const adaptAction = typeof options.actionAdapter === "function"
    ? options.actionAdapter
    : (typeof project.adaptAction === "function" ? project.adaptAction : (a) => a);
  const guardDeterminism = options.guardDeterminism !== false;

  let listeners = new Set();

  function makeInitialDoc() {
    const clean = sanitizeBySchema({}, stateSchema);
    return { schemaVersion: SCHEMA_VERSION, updatedAt: 0, revisionCount: 0, state: clean };
  }

  function migrateIfNeeded(rawDoc) {
    if (!rawDoc || typeof rawDoc !== "object") return makeInitialDoc();
    if (rawDoc.schemaVersion === SCHEMA_VERSION) {
      return {
        ...rawDoc,
        revisionCount: Number.isFinite(rawDoc.revisionCount) ? (rawDoc.revisionCount | 0) : (rawDoc.updatedAt | 0)
      };
    }
    if (typeof project.migrate === "function") {
      const migrated = project.migrate(rawDoc, SCHEMA_VERSION);
      if (migrated && migrated.schemaVersion === SCHEMA_VERSION) {
        return {
          ...migrated,
          revisionCount: Number.isFinite(migrated.revisionCount) ? (migrated.revisionCount | 0) : (migrated.updatedAt | 0)
        };
      }
      console.warn("Migration rejected: schemaVersion mismatch. Resetting to initial document.");
    }
    console.warn("Schema mismatch without valid migration. Resetting to initial document.");
    return makeInitialDoc();
  }

  let doc = migrateIfNeeded(driver.load());
  doc.state = sanitizeBySchema(doc.state, stateSchema);

  function docSignature(d) {
    return hash32(stableStringify({ schemaVersion: d.schemaVersion, state: d.state }));
  }

  function getState() { return doc.state; }
  function getDoc() {
    // Return a frozen snapshot so callers cannot mutate internal store state.
    return deepFreeze(cloneDoc(doc));
  }
  function getSignature() { return docSignature(doc); }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { for (const fn of listeners) fn(); }

  function validateAction(action) {
    if (!action || typeof action !== "object") throw new Error("Action must be object");
    const type = action.type;
    if (typeof type !== "string") throw new Error("Action.type must be string");
    const schema = actionSchema[type];
    if (!schema) throw new Error(`Unknown action type: ${type}`);
    const cleanPayload = sanitizeBySchema(action.payload ?? {}, schema);
    return { type, payload: cleanPayload };
  }

  function dispatch(action) {
    const adapted = adaptAction(action);
    const clean = validateAction(adapted);
    const actionAllowed = mutationMatrix[clean.type];
    if (!Array.isArray(actionAllowed)) {
      throw new Error(`Missing mutationMatrix contract for action: ${clean.type}`);
    }

    const reducerRng = createRngStreamsScoped(doc.state.meta.seed, `reducer:${clean.type}:${doc.revisionCount}`);
    const patches = runWithDeterminismGuard(
      () => project.reducer(doc.state, clean, { rng: reducerRng }),
      { enabled: guardDeterminism, actionType: clean.type, phase: "reducer" }
    );

    if (!Array.isArray(patches)) throw new Error("Reducer must return an array of patches");
    assertPatchesAllowed(patches, actionAllowed);

    let nextState = applyPatches(doc.state, patches);
    nextState = sanitizeBySchema(nextState, stateSchema);

    if (clean.type === "SIM_STEP" && typeof project.simStep === "function") {
      const simRng = createRngStreamsScoped(doc.state.meta.seed, `simStep:${clean.type}:${doc.revisionCount}`);
      const simPatches = runWithDeterminismGuard(
        () => project.simStep(nextState, { rng: simRng }),
        { enabled: guardDeterminism, actionType: clean.type, phase: "simStep" }
      );
      if (!Array.isArray(simPatches)) throw new Error("simStep must return patches array");
      assertPatchesAllowed(simPatches, mutationMatrix["SIM_STEP"]);
      nextState = applyPatches(nextState, simPatches);
      nextState = sanitizeBySchema(nextState, stateSchema);
    }

    const nextRevision = (doc.revisionCount | 0) + 1;
    const nextDoc = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: nextRevision,
      revisionCount: nextRevision,
      state: nextState
    };
    // ZERO TRUST: Freeze state to prevent external mutation.
    // Persist first, then commit in-memory doc to avoid split-brain on save errors.
    deepFreeze(nextDoc.state);
    driver.save(nextDoc);
    doc = nextDoc;
    emit();
    return doc;
  }

  // Initial freeze
  deepFreeze(doc.state);

  return { getState, getDoc, getSignature, subscribe, dispatch };
}

function assertManifestContracts(manifest) {
  if (!manifest || typeof manifest !== "object") throw new Error("Manifest missing");
  const actionSchema = manifest.actionSchema;
  const mutationMatrix = manifest.mutationMatrix;
  if (!actionSchema || typeof actionSchema !== "object") throw new Error("Manifest actionSchema missing");
  if (!mutationMatrix || typeof mutationMatrix !== "object") throw new Error("Manifest mutationMatrix missing");
  for (const actionType of Object.keys(actionSchema)) {
    if (!Array.isArray(mutationMatrix[actionType])) {
      throw new Error(`Manifest mutationMatrix missing array for action: ${actionType}`);
    }
  }
}

function runWithDeterminismGuard(fn, meta) {
  if (!meta?.enabled) return fn();

  const origRandom = Math.random;
  const OrigDate = globalThis.Date;
  const dateNowDesc = Object.getOwnPropertyDescriptor(Date, "now");
  const perf = globalThis.performance;
  const perfProto = perf ? Object.getPrototypeOf(perf) : null;
  const perfNowDescOwn = perf ? Object.getOwnPropertyDescriptor(perf, "now") : null;
  const perfNowDescProto = perfProto ? Object.getOwnPropertyDescriptor(perfProto, "now") : null;
  const cryptoObj = globalThis.crypto;
  const blocked = (name) => () => { throw new Error(`Non-deterministic source blocked: ${name} (${meta.phase}:${meta.actionType})`); };
  const restorers = [];

  Math.random = blocked("Math.random");
  if (dateNowDesc && dateNowDesc.writable) Date.now = blocked("Date.now");
  // Block new Date() and Date() in guarded execution.
  function GuardedDate(...args) {
    if (!new.target) throw new Error(`Non-deterministic source blocked: Date() (${meta.phase}:${meta.actionType})`);
    throw new Error(`Non-deterministic source blocked: new Date() (${meta.phase}:${meta.actionType})`);
  }
  GuardedDate.UTC = OrigDate.UTC.bind(OrigDate);
  GuardedDate.parse = OrigDate.parse.bind(OrigDate);
  GuardedDate.prototype = OrigDate.prototype;
  GuardedDate.now = blocked("Date.now");
  globalThis.Date = GuardedDate;

  if (perf && perfNowDescOwn && perfNowDescOwn.writable) {
    perf.now = blocked("performance.now");
  } else if (perfProto && perfNowDescProto && perfNowDescProto.writable) {
    perfProto.now = blocked("performance.now");
  }
  const restoreCryptoGetRandomValues = patchCallableIfPossible(cryptoObj, "getRandomValues", blocked("crypto.getRandomValues"));
  if (typeof restoreCryptoGetRandomValues === "function") restorers.push(restoreCryptoGetRandomValues);
  const restoreCryptoRandomUUID = patchCallableIfPossible(cryptoObj, "randomUUID", blocked("crypto.randomUUID"));
  if (typeof restoreCryptoRandomUUID === "function") restorers.push(restoreCryptoRandomUUID);

  try {
    return fn();
  } finally {
    for (let i = restorers.length - 1; i >= 0; i--) {
      try { restorers[i](); } catch {}
    }
    globalThis.Date = OrigDate;
    Math.random = origRandom;
    if (dateNowDesc && dateNowDesc.writable) Date.now = dateNowDesc.value;
    if (perf && perfNowDescOwn && perfNowDescOwn.writable) perf.now = perfNowDescOwn.value;
    else if (perfProto && perfNowDescProto && perfNowDescProto.writable) perfProto.now = perfNowDescProto.value;
  }
}

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    // Cannot freeze TypedArrays (ArrayBufferViews) with elements in JS.
    if (ArrayBuffer.isView(obj)) return obj;
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

function cloneDoc(doc) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(doc);
  }
  return JSON.parse(JSON.stringify(doc));
}

function patchCallableIfPossible(target, key, replacement) {
  if (!target) return null;
  const desc = Object.getOwnPropertyDescriptor(target, key);
  if (desc?.writable) {
    const prev = target[key];
    target[key] = replacement;
    return () => { target[key] = prev; };
  }
  if (desc?.configurable) {
    const prevDesc = desc;
    Object.defineProperty(target, key, {
      configurable: prevDesc.configurable,
      enumerable: prevDesc.enumerable,
      writable: true,
      value: replacement
    });
    return () => { Object.defineProperty(target, key, prevDesc); };
  }
  const proto = Object.getPrototypeOf(target);
  if (!proto) return null;
  const protoDesc = Object.getOwnPropertyDescriptor(proto, key);
  if (protoDesc?.writable) {
    const prev = proto[key];
    proto[key] = replacement;
    return () => { proto[key] = prev; };
  }
  if (protoDesc?.configurable) {
    const prevDesc = protoDesc;
    Object.defineProperty(proto, key, {
      configurable: prevDesc.configurable,
      enumerable: prevDesc.enumerable,
      writable: true,
      value: replacement
    });
    return () => { Object.defineProperty(proto, key, prevDesc); };
  }
  return null;
}
