import { createStore } from "./kernel/store.js";
import { manifest } from "./project/unified.manifest.js";
import { adaptLegacyAction } from "./project/unified.adapters.js";
import { reducer, simStep } from "./project/project.logic.js";
import { resolveProfileFromRuntime } from "./project/release.profiles.js";
import { wireUi } from "./project/ui.js";

const root = document.querySelector("#app");
if (!root) {
  throw new Error("Missing #app mount node");
}
const store = createStore(manifest, { reducer, simStep }, { actionAdapter: adaptLegacyAction });

function readRuntimeProfileStorage() {
  try {
    return globalThis.localStorage?.getItem("SUBSTRATE_PROFILE") || "";
  } catch (err) {
    throw new Error(`SUBSTRATE_PROFILE read failed: ${String(err?.message || err)}`);
  }
}

const runtimeProfile = resolveProfileFromRuntime(globalThis.location?.search || "", readRuntimeProfileStorage());
if (runtimeProfile !== store.getState().app.releaseProfile) {
  store.dispatch({ type: "SET_RELEASE_PROFILE", payload: { profile: runtimeProfile } });
}

wireUi(root, store);
