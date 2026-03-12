import fs from "node:fs";
import path from "node:path";
import { createCanvasFxController } from "../../src/project/canvas.fx.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeCtx(log) {
  const grad = () => ({ addColorStop() {} });
  return {
    setTransform() {},
    scale() {},
    clearRect() {},
    save() {},
    translate() {},
    fillRect() {},
    beginPath() {},
    arc(x, y, r) { log.push(`arc:${x.toFixed(3)}:${y.toFixed(3)}:${r.toFixed(3)}`); },
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    ellipse() {},
    restore() {},
    createLinearGradient: grad,
    createRadialGradient: grad,
    set fillStyle(v) {},
    get fillStyle() { return ""; },
    set strokeStyle(v) {},
    get strokeStyle() { return ""; },
    set lineWidth(v) {},
    get lineWidth() { return 1; }
  };
}

function makeRoot(log) {
  const mapCanvas = { clientWidth: 320, clientHeight: 200 };
  const fxCanvas = {
    clientWidth: 320,
    clientHeight: 200,
    width: 0,
    height: 0,
    getContext() { return makeCtx(log); }
  };
  return {
    querySelector(sel) {
      if (sel === '[data-city-map="1"]') return mapCanvas;
      if (sel === '[data-city-fx="1"]') return fxCanvas;
      return null;
    }
  };
}

function makeState(seed = "seed-A") {
  return {
    meta: { seed },
    ui: { screen: "GAME" },
    game: {
      hp: 10,
      playerDistrict: 0,
      transit: { active: false, from: 0, to: 1, progress: 0, cooldown: 0 },
      encounter: { active: false, required: "DECISION" },
      combat: { enemyHp: 8, active: false, phase: "NONE", lastOutcome: "NONE" },
      over: false,
      winLose: { state: "ONGOING" }
    }
  };
}

function seededStub(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return (x & 0x0fffffff) / 0x10000000;
  };
}

function runSignature({ randomFn, seed }) {
  const prevWindow = globalThis.window;
  const prevRandom = Math.random;
  globalThis.window = {
    devicePixelRatio: 1,
    matchMedia() { return { matches: false }; }
  };
  Math.random = randomFn;

  const log = [];
  const ctrl = createCanvasFxController();
  const state = makeState(seed);
  ctrl.attach(makeRoot(log), state);
  ctrl.step(16, state, {});
  ctrl.step(16, state, {});
  ctrl.detach();

  Math.random = prevRandom;
  globalThis.window = prevWindow;
  return log.join("|");
}

const fxPath = path.resolve("/root/Substrate/src/project/canvas.fx.js");
const fxSource = fs.readFileSync(fxPath, "utf8");
assert(!fxSource.includes("Math.random("), "canvas.fx must not call Math.random directly");

const sigA = runSignature({ randomFn: seededStub(1), seed: "alpha-seed" });
const sigB = runSignature({ randomFn: seededStub(2), seed: "alpha-seed" });
assert(sigA === sigB, "canvas fx output changed with different global Math.random for same seed+state");

const sigC = runSignature({ randomFn: seededStub(1), seed: "beta-seed" });
assert(sigA !== sigC, "canvas fx seed is ignored; expected different signature for different state seed");

console.log("DETERMINISM_CANVAS_OK");
