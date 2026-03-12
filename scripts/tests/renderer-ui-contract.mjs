import fs from "node:fs";
import { advanceUiSimDeterministic } from "../../src/project/ui.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function scanNoStateWrites(code, label) {
  // Disallow direct assignments to state.* (but allow comparisons like ===, <=, >=, !=).
  const lines = code.split("\n");
  for (const [idx, line] of lines.entries()) {
    if (!line.includes("state.")) continue;
    if (/\bstate\.[\w$.[\]]+\s*(?:\+\+|--|[+\-*/%]?=)(?!=)/.test(line)) {
      throw new Error(`${label}: direct assignment to state.* is forbidden (line ${idx + 1})`);
    }
  }

  // Disallow mutating array methods on state.* targets
  for (const [idx, line] of lines.entries()) {
    if (!line.includes("state.")) continue;
    if (/\bstate\.[\w$.\[\]]+\.(push|pop|splice|shift|unshift)\s*\(/.test(line)) {
      throw new Error(`${label}: mutating array methods on state.* are forbidden (line ${idx + 1})`);
    }
  }
}

// 1) Static renderer contract: read-only state usage and no dispatch in renderer.
{
  const rendererCode = read("src/project/renderer.js");
  scanNoStateWrites(rendererCode, "renderer.js");
  assert(!/\bstore\.dispatch\s*\(/.test(rendererCode), "renderer.js: store.dispatch must not be used");
}

// 2) Static UI contract: no direct state mutation in ui wiring.
{
  const uiCode = read("src/project/ui.js");
  scanNoStateWrites(uiCode, "ui.js");
}

// 3) Behavioral contract for advanceUiSimDeterministic
function makeState(overrides = {}) {
  return {
    ui: { screen: "GAME" },
    game: {
      over: false,
      transit: { active: false },
      encounter: { active: false },
      combat: { active: false, phase: "NONE" },
      ...overrides.game
    },
    ...overrides
  };
}

function makeStore(initialState) {
  let st = initialState;
  const actions = [];
  return {
    getState() { return st; },
    setState(next) { st = next; },
    dispatch(action) {
      actions.push(action);
    },
    actions
  };
}

// inactive state => no dispatch
{
  const store = makeStore(makeState({ game: { over: true, transit: { active: false }, encounter: { active: false }, combat: { active: false, phase: "NONE" } } }));
  const acc = advanceUiSimDeterministic(store, 0, 1000);
  assert(store.actions.length === 0, "advanceUiSimDeterministic: inactive state must not dispatch");
  assert(acc === 1000, "advanceUiSimDeterministic: accumulator should keep value when inactive");
}

// active transit state => deterministic step count by dt/130ms
{
  const store = makeStore(makeState({ game: { transit: { active: true }, encounter: { active: false }, combat: { active: false, phase: "NONE" } } }));
  const acc = advanceUiSimDeterministic(store, 0, 390);
  assert(store.actions.length === 3, "advanceUiSimDeterministic: expected 3 SIM_STEP dispatches for 390ms");
  assert(store.actions.every((a) => a?.type === "SIM_STEP"), "advanceUiSimDeterministic: only SIM_STEP dispatches allowed");
  assert(Math.abs(acc) < 1e-9, "advanceUiSimDeterministic: accumulator remainder should be 0 for exact multiples");
}

// guard must cap catch-up loop
{
  const store = makeStore(makeState({ game: { transit: { active: true }, encounter: { active: false }, combat: { active: false, phase: "NONE" } } }));
  const acc = advanceUiSimDeterministic(store, 0, 130 * 500);
  assert(store.actions.length <= 65, "advanceUiSimDeterministic: guard should cap dispatches");
  assert(Number.isFinite(acc), "advanceUiSimDeterministic: accumulator should remain finite");
}

console.log("RENDERER_UI_CONTRACT_OK");
