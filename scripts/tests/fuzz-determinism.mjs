import { stableStringify } from "../../src/kernel/stableStringify.js";
import { createStore } from "../../src/kernel/store.js";
import { createRngStreamsScoped } from "../../src/kernel/rng.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load: () => doc,
    save: (next) => { doc = next; }
  };
}

function makeInitialDoc(seed) {
  return {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: { meta: { seed } }
  };
}

function buildIntentSequence(seqSeed, length = 500) {
  const rng = createRngStreamsScoped(seqSeed, "fuzz-seq").sim;
  const choices = ["SCOUT", "FORAGE", "REST"];
  const stances = ["AGGRESSIVE", "DEFENSIVE", "BALANCED"];
  const interventions = [
    "LIGHT_PULSE",
    "NUTRIENT_INJECTION",
    "TOXIN_ABSORB",
    "STRENGTHEN_LINEAGE",
    "TRIGGER_RAID",
    "BUILD_BRIDGE",
    "QUARANTINE_ZONE"
  ];

  const seq = [];
  for (let i = 0; i < length; i++) {
    const kind = rng.int(0, 8);
    seq.push({
      kind,
      choice: choices[rng.int(0, choices.length)],
      stance: stances[rng.int(0, stances.length)],
      intervention: interventions[rng.int(0, interventions.length)],
      districtOffset: rng.int(1, 3),
      optionIndex: rng.int(0, 4)
    });
  }
  return seq;
}

function runFuzz(seed, seqSeed, sequence) {
  const store = createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(makeInitialDoc(seed)) }
  );

  store.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: "beta" } });
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });

  for (const step of sequence) {
    const st = store.getState();
    if (st.game.over) {
      store.dispatch({ type: "SIM_STEP", payload: {} });
      continue;
    }

    if (!st.game.transit.active && st.ui.screen === "GAME") {
      const to = (st.game.playerDistrict + step.districtOffset) % 7;
      store.dispatch({ type: "TRAVEL_TO", payload: { to } });
    }

    if (step.kind % 2 === 0) {
      store.dispatch({ type: "CHOOSE_ACTION", payload: { choice: step.choice } });
    }

    const enc = store.getState().game.encounter;
    if (enc.active) {
      const opt = enc.options[step.optionIndex % Math.max(1, enc.options.length)] || enc.options[0];
      store.dispatch({
        type: "RESOLVE_ENCOUNTER",
        payload: { mode: opt?.mode || enc.required || "DECISION", optionId: opt?.id || "" }
      });
    }

    const combat = store.getState().game.combat;
    if (combat.active && combat.phase === "PREP") {
      store.dispatch({ type: "CHANGE_STANCE", payload: { stance: step.stance } });
      store.dispatch({ type: "BEGIN_COMBAT", payload: {} });
      if (step.kind === 5) {
        store.dispatch({ type: "RETREAT_FROM_COMBAT", payload: {} });
      }
    }

    if (step.kind === 3) {
      store.dispatch({ type: "INTERVENE", payload: { kind: step.intervention } });
    }

    store.dispatch({ type: "SIM_STEP", payload: {} });

    if (store.getState().game.combat.phase === "RESOLVED") {
      store.dispatch({ type: "COLLECT_COMBAT_LOOT", payload: {} });
    }
  }

  const doc = store.getDoc();
  const final = store.getState();
  assert(Number.isFinite(final.game.round), "round not finite");
  assert(final.game.supplies === final.game.resources.supplies, "supply mirror broken");
  return {
    signature: store.getSignature(),
    snapshot: stableStringify(final),
    revisionCount: doc.revisionCount
  };
}

const sequence = buildIntentSequence("fuzz-sequence-seed", 520);
const a = runFuzz("fuzz-state-seed-A", "fuzz-sequence-seed", sequence);
const b = runFuzz("fuzz-state-seed-A", "fuzz-sequence-seed", sequence);
const c = runFuzz("fuzz-state-seed-B", "fuzz-sequence-seed", sequence);

assert(a.signature === b.signature, "same seed + same sequence signature mismatch");
assert(a.snapshot === b.snapshot, "same seed + same sequence snapshot mismatch");
assert(a.revisionCount === b.revisionCount, "same seed + same sequence revision mismatch");
assert(a.signature !== c.signature || a.snapshot !== c.snapshot, "different state seed should diverge under fixed sequence");

console.log("FUZZ_DETERMINISM_OK");
