import { stableStringify } from "./stableStringify.js";
import { hash32 } from "./hash32.js";
import { applyPatches, assertPatchesAllowed } from "./patches.js";
import { sanitizeBySchema } from "./schema.js";
import { createRngStreams } from "./rng.js";
import { getDefaultDriver } from "./persistence.js";

export function createStore(manifest, project, options = {}) {
  const { SCHEMA_VERSION, stateSchema, actionSchema, mutationMatrix } = manifest;
  const driver = options.storageDriver || getDefaultDriver();

  let listeners = new Set();

  function makeInitialDoc() {
    const clean = sanitizeBySchema({}, stateSchema);
    return { schemaVersion: SCHEMA_VERSION, updatedAt: 0, state: clean };
  }

  function migrateIfNeeded(rawDoc) {
    if (!rawDoc || typeof rawDoc !== "object") return makeInitialDoc();
    if (rawDoc.schemaVersion === SCHEMA_VERSION) return rawDoc;
    if (typeof project.migrate === "function") {
      const migrated = project.migrate(rawDoc, SCHEMA_VERSION);
      if (migrated && migrated.schemaVersion === SCHEMA_VERSION) return migrated;
    }
    return makeInitialDoc();
  }

  let doc = migrateIfNeeded(driver.load());
  doc.state = sanitizeBySchema(doc.state, stateSchema);

  let rngStreams = createRngStreams(doc.state.meta.seed);

  function docSignature(d) {
    return hash32(stableStringify({ schemaVersion: d.schemaVersion, state: d.state }));
  }

  function getState() { return doc.state; }
  function getDoc() { return doc; }
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
    const clean = validateAction(action);
    rngStreams = createRngStreams(doc.state.meta.seed);

    const allowed = mutationMatrix[clean.type] || [];
    const patches = project.reducer(doc.state, clean, { rng: rngStreams });

    if (!Array.isArray(patches)) throw new Error("Reducer must return an array of patches");
    assertPatchesAllowed(patches, allowed);

    let nextState = applyPatches(doc.state, patches);
    nextState = sanitizeBySchema(nextState, stateSchema);

    if (clean.type === "SIM_STEP" && typeof project.simStep === "function") {
      const simPatches = project.simStep(nextState, { rng: rngStreams });
      if (!Array.isArray(simPatches)) throw new Error("simStep must return patches array");
      assertPatchesAllowed(simPatches, mutationMatrix["SIM_STEP"] || []);
      nextState = applyPatches(nextState, simPatches);
      nextState = sanitizeBySchema(nextState, stateSchema);
    }

    doc = { schemaVersion: SCHEMA_VERSION, updatedAt: (doc.updatedAt|0) + 1, state: nextState };
    // ZERO TRUST: Freeze state to prevent external mutation
    deepFreeze(doc.state);
    driver.save(doc);
    emit();
    return doc;
  }

  // Initial freeze
  deepFreeze(doc.state);

  return { getState, getDoc, getSignature, subscribe, dispatch };
}

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}
