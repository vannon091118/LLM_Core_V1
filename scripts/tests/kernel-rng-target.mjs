import { createRngStreams, createRngStreamsScoped, hashMix32, rng01, hashString } from "../../src/kernel/rng.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sampleTriplet(stream, n = 8) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push([stream.u32(), stream.f01(), stream.int(10, 20)]);
  }
  return JSON.stringify(out);
}

// 1) Determinism: same seed must produce same stream outputs
{
  const a = createRngStreams("seed-A");
  const b = createRngStreams("seed-A");
  assert(sampleTriplet(a.world) === sampleTriplet(b.world), "same seed world stream must be deterministic");
  assert(sampleTriplet(a.sim) === sampleTriplet(b.sim), "same seed sim stream must be deterministic");
  assert(sampleTriplet(a.cos) === sampleTriplet(b.cos), "same seed cos stream must be deterministic");
}

// 2) Divergence: different seeds should diverge
{
  const a = createRngStreams("seed-A");
  const c = createRngStreams("seed-B");
  const wa = sampleTriplet(a.world);
  const wc = sampleTriplet(c.world);
  assert(wa !== wc, "different seeds should diverge for world stream");
}

// 3) Scoped streams: same seed but different scope should diverge
{
  const a = createRngStreamsScoped("scope-seed", "alpha");
  const b = createRngStreamsScoped("scope-seed", "beta");
  assert(sampleTriplet(a.sim) !== sampleTriplet(b.sim), "scoped streams should diverge across scopes");
}

// 4) Range and bounds contracts
{
  const s = createRngStreams("range-seed");
  for (let i = 0; i < 64; i++) {
    const x = s.world.int(-5, 7);
    assert(Number.isInteger(x), "int() should return integer");
    assert(x >= -5 && x < 7, "int() should respect [min, max)");
    const f = s.world.f01();
    assert(f >= 0 && f < 1, "f01() should be in [0,1)");
  }
}

// 5) hash/rng helper determinism
{
  assert(hashString("abc") === hashString("abc"), "hashString should be deterministic");
  assert(hashMix32(123, 4) === hashMix32(123, 4), "hashMix32 should be deterministic");
  const r = rng01(123, 4);
  assert(r >= 0 && r < 1, "rng01 should be in [0,1)");
}

console.log("KERNEL_RNG_TARGET_OK");
