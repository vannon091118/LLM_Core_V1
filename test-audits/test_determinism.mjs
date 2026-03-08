import { createRngStreams } from "./kernel/rng.js";

function runTest(seed) {
  const streams = createRngStreams(seed);
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(streams.sim.f01());
  }
  return results;
}

const seed = "test-seed-123";
const run1 = runTest(seed);
const run2 = runTest(seed);

let identical = true;
for (let i = 0; i < run1.length; i++) {
  if (run1[i] !== run2[i]) {
    identical = false;
    break;
  }
}

console.log("=== DETERMINISM TEST ===");
console.log("Seed:", seed);
console.log("Run 1 (first 5):", run1.slice(0, 5));
console.log("Run 2 (first 5):", run2.slice(0, 5));
console.log("Identical:", identical);

if (!identical) {
  process.exit(1);
}
