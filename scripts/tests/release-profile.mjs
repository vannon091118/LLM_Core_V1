import { createStore } from "../../src/kernel/store.js";
import { manifest } from "../../src/project/unified.manifest.js";
import { adaptLegacyAction } from "../../src/project/unified.adapters.js";
import { reducer, simStep } from "../../src/project/project.logic.js";
import { featureFlagsForProfile } from "../../src/project/release.profiles.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function memoryDriver(initialDoc = null) {
  let doc = initialDoc;
  return {
    load() { return doc; },
    save(next) { doc = next; }
  };
}

function makeStore(initialDoc = null) {
  return createStore(
    manifest,
    { reducer, simStep },
    { actionAdapter: adaptLegacyAction, storageDriver: memoryDriver(initialDoc) }
  );
}

function bootToGame(store) {
  store.dispatch({ type: "START_GAME", payload: {} });
  store.dispatch({ type: "ACCEPT_RULES", payload: {} });
  store.dispatch({ type: "CHOOSE_LOADOUT", payload: { loadout: "SURVIVOR" } });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
  store.dispatch({ type: "NEXT_DIALOG", payload: {} });
}

// 1) Default profile must be beta-compatible by manifest defaults.
{
  const s = makeStore();
  const st = s.getState();
  const expected = featureFlagsForProfile(st.app.releaseProfile);
  assert(st.app.releaseProfile === "beta", "default releaseProfile should be beta");
  assert(st.app.featureFlags.autoResolveEncounterTimeout === expected.autoResolveEncounterTimeout, "default autoResolve flag mismatch");
  assert(st.app.featureFlags.strictInfluenceDefeat === expected.strictInfluenceDefeat, "default strictInfluenceDefeat flag mismatch");
  assert(st.app.featureFlags.enableRaidIntervention === expected.enableRaidIntervention, "default enableRaidIntervention flag mismatch");
}

// 2) Alpha profile must block TRIGGER_RAID intervention.
{
  const s = makeStore();
  s.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: "alpha" } });
  bootToGame(s);
  s.dispatch({ type: "INTERVENE", payload: { kind: "TRIGGER_RAID" } });
  assert(s.getState().game.substrate.lastIntervention !== "TRIGGER_RAID", "alpha should block TRIGGER_RAID");
  assert(/deaktiviert/i.test(s.getState().game.lastEvent), "alpha block message missing");
}

// 3) Timeout auto-resolve: rc resolves, alpha keeps encounter active.
{
  const baseDoc = {
    schemaVersion: manifest.SCHEMA_VERSION,
    updatedAt: 0,
    revisionCount: 0,
    state: {
      meta: { seed: "profile-timeout-seed" },
      ui: { screen: "GAME" },
      app: {
        firstStart: false,
        releaseProfile: "rc",
        featureFlags: featureFlagsForProfile("rc")
      },
      game: {
        encounter: {
          active: true,
          required: "DECISION",
          text: "Timeout test encounter",
          decisionId: "timeout_case",
          ageTicks: 5,
          timeoutTicks: 6,
          options: [{ id: "wait", label: "Abwarten", mode: "DECISION" }]
        }
      }
    }
  };

  const rc = makeStore(baseDoc);
  rc.dispatch({ type: "SIM_STEP", payload: {} });
  assert(rc.getState().game.encounter.active === false, "rc should auto-resolve timeout encounter");

  const alphaDoc = {
    ...baseDoc,
    state: {
      ...baseDoc.state,
      app: {
        firstStart: false,
        releaseProfile: "alpha",
        featureFlags: featureFlagsForProfile("alpha")
      }
    }
  };
  const alpha = makeStore(alphaDoc);
  alpha.dispatch({ type: "SIM_STEP", payload: {} });
  assert(alpha.getState().game.encounter.active === true, "alpha should not auto-resolve timeout encounter");
}

console.log("RELEASE_PROFILE_OK");
