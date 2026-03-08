import { createRngStreams } from "./kernel/rng.js";

function runSequence(seed) {
  const streams = createRngStreams(seed);
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(streams.world.f01());
  }
  return results;
}

const seed = "test-seed-123";
const run1 = runSequence(seed);
const run2 = runSequence(seed);

console.log("Run 1:", run1);
console.log("Run 2:", run2);

const match = JSON.stringify(run1) === JSON.stringify(run2);

if (match) {
  console.log("TEST RED: Seed is deterministic. Both runs are identical.");
  console.log("Why it is deterministic: It uses a pure xorshift32 implementation seeded by a hash of the input string. No external entropy (Date, Math.random) is used.");
} else {
  console.log("TEST GREEN: Lücke im Code gefunden! Runs differ.");
  // Analyze why if it happens
}
