import { createStore } from "./kernel/store.js";

// Dummy project logic
const reducer = (state, action) => {
  if (action.type === "SET_NAME") {
    state.user = { name: action.payload.name }; // Direct mutation attempt?
    return [];
  }
  return [];
};

const manifest = {
  SCHEMA_VERSION: 1,
  stateSchema: { type: "object", shape: {} },
  actionSchema: {},
  mutationMatrix: {}
};

const store = createStore(manifest, { reducer });
console.log("Setting name...");
try {
  store.dispatch({ type: "SET_NAME", payload: { name: "Alice" } });
  console.log("State:", store.getState());
} catch (e) {
  console.error("Error during dispatch:", e.message);
}
